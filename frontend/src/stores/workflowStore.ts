import { create } from 'zustand';
import type { Stage, StageType, PlatformSelection } from '@/types';
import { stagesApi } from '@/lib/api';

interface WorkflowState {
  stages: Stage[];
  currentStage: Stage | null;
  isGenerating: boolean;
  error: string | null;

  fetchStages: (projectId: string) => Promise<void>;
  fetchStage: (projectId: string, stageType: StageType) => Promise<void>;
  generate: (projectId: string, stageType: StageType) => Promise<Stage>;
  selectDirection: (projectId: string, directionId: number) => Promise<Stage>;
  selectPlatform: (projectId: string, selection: PlatformSelection) => Promise<Stage>;
  selectFeatures: (projectId: string, featureIds: number[]) => Promise<Stage>;
  confirmStage: (projectId: string, stageType: StageType) => Promise<Stage>;
  setCurrentStage: (stage: Stage | null) => void;
  setStages: (stages: Stage[]) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  stages: [],
  currentStage: null,
  isGenerating: false,
  error: null,

  fetchStages: async (projectId) => {
    try {
      const stages = await stagesApi.list(projectId);
      set({ stages, error: null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchStage: async (projectId, stageType) => {
    try {
      const stage = await stagesApi.get(projectId, stageType);
      set({ currentStage: stage, error: null });
    } catch (error: any) {
      set({ error: error.message, currentStage: null });
    }
  },

  generate: async (projectId, stageType) => {
    set({ isGenerating: true, error: null });
    try {
      const stage = await stagesApi.generate(projectId, stageType);
      set((state) => ({
        stages: [...state.stages.filter((s) => s.type !== stageType), stage],
        currentStage: stage,
        isGenerating: false,
      }));
      return stage;
    } catch (error: any) {
      set({ error: error.message, isGenerating: false });
      throw error;
    }
  },

  selectDirection: async (projectId, directionId) => {
    try {
      const stage = await stagesApi.select(projectId, 'direction', directionId);
      set((state) => ({
        stages: state.stages.map((s) => (s.type === 'direction' ? stage : s)),
        currentStage: stage,
      }));
      return stage;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  selectPlatform: async (projectId, selection) => {
    try {
      const stage = await stagesApi.selectPlatform(projectId, selection);
      set((state) => ({
        stages: [...state.stages.filter((s) => s.type !== 'platform'), stage],
        currentStage: stage,
      }));
      return stage;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  selectFeatures: async (projectId, featureIds) => {
    try {
      const stage = await stagesApi.selectFeatures(projectId, featureIds);
      set((state) => ({
        stages: state.stages.map((s) => (s.type === 'features' ? stage : s)),
        currentStage: stage,
      }));
      return stage;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  confirmStage: async (projectId, stageType) => {
    try {
      const stage = await stagesApi.confirm(projectId, stageType);
      set((state) => ({
        stages: state.stages.map((s) => (s.type === stageType ? stage : s)),
        currentStage: stage,
      }));
      return stage;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  setCurrentStage: (stage) => {
    set({ currentStage: stage });
  },

  setStages: (stages) => {
    set({ stages });
  },
}));
