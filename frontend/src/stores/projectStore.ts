import { create } from 'zustand';
import type { Project, ProjectWithStages } from '@/types';
import { projectsApi } from '@/lib/api';

interface ProjectState {
  projects: Project[];
  currentProject: ProjectWithStages | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (title: string, idea: string, description?: string) => Promise<ProjectWithStages>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: ProjectWithStages | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectsApi.list();
      set({ projects, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectsApi.get(id);
      set({ currentProject: project, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createProject: async (title, idea, description) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectsApi.create(title, idea, description);
      set((state) => ({
        projects: [project, ...state.projects],
        currentProject: project,
        isLoading: false,
      }));
      return project;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateProject: async (id, updates) => {
    try {
      const updated = await projectsApi.update(id, updates);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? { ...p, ...updated } : p)),
        currentProject:
          state.currentProject?.id === id
            ? { ...state.currentProject, ...updated }
            : state.currentProject,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteProject: async (id) => {
    try {
      await projectsApi.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },
}));
