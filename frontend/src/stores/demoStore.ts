import { create } from 'zustand';
import type {
  DemoProject,
  DemoPlatform,
  DemoPage,
  DemoGenerationProgress,
} from '@/types';
import { demoApi } from '@/lib/api';

// Legacy demo format (from old DemoAgent with files array)
interface LegacyDemoFile {
  filename: string;
  code: string;
  description: string;
}

interface LegacyDemoProject {
  project_name: string;
  description?: string;
  files: LegacyDemoFile[];
  dependencies?: Record<string, string>;
  setup_instructions?: string[];
}

// New format page (from updated DemoAgent)
interface NewFormatPage {
  id: string;
  name: string;
  description: string;
  code: string;
}

interface NewFormatPlatform {
  type: 'pc' | 'mobile';
  pages: NewFormatPage[];
}

interface NewFormatProject {
  project_name: string;
  platforms: NewFormatPlatform[];
  shared_state?: Record<string, any>;
}

// Convert new format (from updated DemoAgent) to store format
function convertNewFormatToStoreFormat(data: NewFormatProject): DemoProject {
  const platforms: DemoPlatform[] = data.platforms.map((platform) => {
    const pages: DemoPage[] = platform.pages.map((page, index) => ({
      id: page.id || `page_${index}`,
      name: page.name,
      path: `/${page.name.toLowerCase().replace(/\s+/g, '-')}`,
      description: page.description,
      code: page.code,
      order: index,
      status: 'completed' as const,
      transitions: [],
    }));

    return {
      type: platform.type,
      subtype: 'full' as const,
      pages,
      navigation: {
        type: platform.type === 'mobile' ? 'bottom' as const : 'sidebar' as const,
        items: pages.map(p => p.id),
      },
    };
  });

  return {
    project_name: data.project_name,
    platforms,
    shared_state: data.shared_state || {},
    generation_metadata: {
      total_pages: platforms.reduce((sum, p) => sum + p.pages.length, 0),
      generated_at: new Date().toISOString(),
    },
  };
}

// Convert legacy format (files array) to new format
function convertLegacyToNewFormat(legacy: LegacyDemoProject): DemoProject {
  // Convert files to pages, using description as name when possible
  const pages: DemoPage[] = legacy.files.map((file, index) => {
    // Extract component name from filename
    const filename = file.filename;
    const match = filename.match(/([^/]+)\.(tsx?|jsx?)$/);
    const componentName = match ? match[1] : `Page${index + 1}`;

    // Use description as display name if available, otherwise use component name
    let displayName = file.description || componentName;
    // If description is too long, truncate it
    if (displayName.length > 30) {
      displayName = displayName.substring(0, 30) + '...';
    }

    // Generate a path from filename
    let path = '/';
    if (filename.includes('pages/') || filename.includes('components/')) {
      const pathMatch = filename.match(/(?:pages|components)\/([^.]+)/);
      if (pathMatch) {
        path = '/' + pathMatch[1].toLowerCase();
      }
    } else if (componentName.toLowerCase() !== 'app') {
      path = '/' + componentName.toLowerCase();
    }

    return {
      id: `page_${index}`,
      name: displayName,
      path,
      description: file.description,
      code: file.code,
      order: index,
      status: 'completed' as const,
      transitions: [],
    };
  });

  // Create a single PC platform with all pages
  const platform: DemoPlatform = {
    type: 'pc',
    subtype: 'full',
    pages,
    navigation: {
      type: 'sidebar',
      items: pages.map(p => p.id),
    },
  };

  return {
    project_name: legacy.project_name,
    platforms: [platform],
    shared_state: {},
    generation_metadata: {
      total_pages: pages.length,
      generated_at: new Date().toISOString(),
    },
  };
}

// Check if data is in legacy format (files array)
function isLegacyFormat(data: any): data is LegacyDemoProject {
  return data && Array.isArray(data.files) && !data.platforms;
}

// Check if data is in new format (platforms array but needs conversion)
function isNewFormat(data: any): data is NewFormatProject {
  return data && Array.isArray(data.platforms) && data.platforms.length > 0 &&
    data.platforms[0].pages && !data.platforms[0].navigation;
}

interface DemoState {
  // Data
  demoProject: DemoProject | null;
  platforms: DemoPlatform[];
  currentPlatform: 'pc' | 'mobile' | null;
  currentPageId: string | null;
  sharedState: Record<string, any>;
  navigationHistory: string[];

  // Generation state
  isGenerating: boolean;
  generationProgress: DemoGenerationProgress;
  generatingPageCode: Record<string, string>; // Partial code during generation

  // UI state
  error: string | null;
  viewMode: 'preview' | 'code' | 'split';

  // Actions
  setDemoProject: (project: DemoProject) => void;
  setPlatforms: (platforms: DemoPlatform[]) => void;
  setCurrentPlatform: (platform: 'pc' | 'mobile') => void;
  setCurrentPageId: (pageId: string | null) => void;
  navigateToPage: (pageId: string, stateChanges?: Record<string, any>) => void;
  goBack: () => void;
  updateSharedState: (changes: Record<string, any>) => void;

  // Generation actions
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: Partial<DemoGenerationProgress>) => void;
  appendPageCode: (pageId: string, chunk: string) => void;
  completePageGeneration: (pageId: string, code: string) => void;
  setPageStatus: (pageId: string, status: DemoPage['status']) => void;
  setPageError: (pageId: string, error: string) => void;

  // UI actions
  setError: (error: string | null) => void;
  setViewMode: (mode: 'preview' | 'code' | 'split') => void;

  // Data fetching
  fetchDemoStructure: (projectId: string) => Promise<void>;
  fetchPage: (projectId: string, pageId: string) => Promise<DemoPage>;

  // Helpers
  getCurrentPage: () => DemoPage | null;
  getPageById: (pageId: string) => DemoPage | null;
  reset: () => void;
}

const initialState = {
  demoProject: null,
  platforms: [],
  currentPlatform: null as 'pc' | 'mobile' | null,
  currentPageId: null as string | null,
  sharedState: {},
  navigationHistory: [] as string[],
  isGenerating: false,
  generationProgress: {
    totalPages: 0,
    completedPages: 0,
    currentPageId: null,
    currentPageName: null,
  },
  generatingPageCode: {},
  error: null as string | null,
  viewMode: 'preview' as const,
};

export const useDemoStore = create<DemoState>((set, get) => ({
  ...initialState,

  setDemoProject: (project) => {
    // Handle all formats: legacy (files), new (platforms without navigation), and store format
    let normalizedProject: DemoProject;

    if (isLegacyFormat(project)) {
      // Convert legacy format (files array) to store format
      normalizedProject = convertLegacyToNewFormat(project as any);
    } else if (isNewFormat(project)) {
      // Convert new format (platforms without navigation) to store format
      normalizedProject = convertNewFormatToStoreFormat(project as any);
    } else {
      // Already in store format
      normalizedProject = project;
    }

    set({
      demoProject: normalizedProject,
      platforms: normalizedProject.platforms || [],
      sharedState: normalizedProject.shared_state || {},
    });

    // Auto-select first platform and page
    if (normalizedProject.platforms && normalizedProject.platforms.length > 0) {
      const firstPlatform = normalizedProject.platforms[0];
      set({ currentPlatform: firstPlatform.type });

      if (firstPlatform.pages && firstPlatform.pages.length > 0) {
        const sortedPages = [...firstPlatform.pages].sort((a, b) => a.order - b.order);
        set({ currentPageId: sortedPages[0].id });
      }
    }
  },

  setPlatforms: (platforms) => set({ platforms }),

  setCurrentPlatform: (platform) => {
    set({ currentPlatform: platform });

    // Auto-select first page of the platform
    const { platforms } = get();
    const selectedPlatform = platforms.find((p) => p.type === platform);
    if (selectedPlatform && selectedPlatform.pages.length > 0) {
      const sortedPages = [...selectedPlatform.pages].sort((a, b) => a.order - b.order);
      set({
        currentPageId: sortedPages[0].id,
        navigationHistory: [],
      });
    }
  },

  setCurrentPageId: (pageId) => set({ currentPageId: pageId }),

  navigateToPage: (pageId, stateChanges) => {
    const { currentPageId, sharedState, navigationHistory } = get();

    // Add current page to history
    if (currentPageId) {
      set({ navigationHistory: [...navigationHistory, currentPageId] });
    }

    // Update state if provided
    if (stateChanges) {
      set({ sharedState: { ...sharedState, ...stateChanges } });
    }

    set({ currentPageId: pageId });
  },

  goBack: () => {
    const { navigationHistory } = get();
    if (navigationHistory.length === 0) return;

    const newHistory = [...navigationHistory];
    const previousPageId = newHistory.pop();

    set({
      currentPageId: previousPageId || null,
      navigationHistory: newHistory,
    });
  },

  updateSharedState: (changes) => {
    const { sharedState } = get();
    set({ sharedState: { ...sharedState, ...changes } });
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setGenerationProgress: (progress) => {
    const { generationProgress } = get();
    set({ generationProgress: { ...generationProgress, ...progress } });
  },

  appendPageCode: (pageId, chunk) => {
    const { generatingPageCode } = get();
    const currentCode = generatingPageCode[pageId] || '';
    set({
      generatingPageCode: {
        ...generatingPageCode,
        [pageId]: currentCode + chunk,
      },
    });
  },

  completePageGeneration: (pageId, code) => {
    const { platforms, generationProgress, generatingPageCode } = get();

    // Update page in platforms
    const updatedPlatforms = platforms.map((platform) => ({
      ...platform,
      pages: platform.pages.map((page) =>
        page.id === pageId
          ? { ...page, code, status: 'completed' as const }
          : page
      ),
    }));

    // Clear generating code for this page
    const newGeneratingCode = { ...generatingPageCode };
    delete newGeneratingCode[pageId];

    set({
      platforms: updatedPlatforms,
      generatingPageCode: newGeneratingCode,
      generationProgress: {
        ...generationProgress,
        completedPages: generationProgress.completedPages + 1,
      },
    });
  },

  setPageStatus: (pageId, status) => {
    const { platforms } = get();

    const updatedPlatforms = platforms.map((platform) => ({
      ...platform,
      pages: platform.pages.map((page) =>
        page.id === pageId ? { ...page, status } : page
      ),
    }));

    set({ platforms: updatedPlatforms });
  },

  setPageError: (pageId, error) => {
    const { platforms } = get();

    const updatedPlatforms = platforms.map((platform) => ({
      ...platform,
      pages: platform.pages.map((page) =>
        page.id === pageId
          ? { ...page, status: 'error' as const, error }
          : page
      ),
    }));

    set({ platforms: updatedPlatforms });
  },

  setError: (error) => set({ error }),

  setViewMode: (viewMode) => set({ viewMode }),

  fetchDemoStructure: async (projectId) => {
    try {
      const structure = await demoApi.getStructure(projectId);
      get().setDemoProject(structure);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchPage: async (projectId, pageId) => {
    try {
      const page = await demoApi.getPage(projectId, pageId);
      return page;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getCurrentPage: () => {
    const { platforms, currentPlatform, currentPageId } = get();
    if (!currentPlatform || !currentPageId) return null;

    const platform = platforms.find((p) => p.type === currentPlatform);
    if (!platform) return null;

    return platform.pages.find((p) => p.id === currentPageId) || null;
  },

  getPageById: (pageId) => {
    const { platforms } = get();
    for (const platform of platforms) {
      const page = platform.pages.find((p) => p.id === pageId);
      if (page) return page;
    }
    return null;
  },

  reset: () => set(initialState),
}));
