import axios from 'axios';
import type {
  User,
  Project,
  ProjectWithStages,
  Stage,
  Collaborator,
  Note,
  AuthResponse,
  PlatformSelection,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  googleAuth: async (accessToken: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/google', { access_token: accessToken });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};

// Projects API
export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const { data } = await api.get('/projects');
    return data;
  },

  create: async (title: string, idea: string, description?: string): Promise<ProjectWithStages> => {
    const { data } = await api.post('/projects', { title, idea, description });
    return data;
  },

  get: async (id: string): Promise<ProjectWithStages> => {
    const { data } = await api.get(`/projects/${id}`);
    return data;
  },

  update: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const { data } = await api.put(`/projects/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

// Stages API
export const stagesApi = {
  list: async (projectId: string): Promise<Stage[]> => {
    const { data } = await api.get(`/projects/${projectId}/stages`);
    return data;
  },

  get: async (projectId: string, stageType: string): Promise<Stage> => {
    const { data } = await api.get(`/projects/${projectId}/stages/${stageType}`);
    return data;
  },

  generate: async (projectId: string, stageType: string): Promise<Stage> => {
    const { data } = await api.post(`/projects/${projectId}/stages/${stageType}/generate`);
    return data;
  },

  select: async (projectId: string, stageType: string, selectedId: number): Promise<Stage> => {
    const { data } = await api.put(`/projects/${projectId}/stages/${stageType}/select`, {
      selected_id: selectedId,
    });
    return data;
  },

  selectFeatures: async (projectId: string, selectedIds: number[]): Promise<Stage> => {
    const url = `/projects/${projectId}/stages/features/select-features`;
    const body = { selected_ids: selectedIds };
    console.log('[API] selectFeatures URL:', url);
    console.log('[API] selectFeatures Body:', JSON.stringify(body));
    try {
      const { data } = await api.put(url, body);
      console.log('[API] selectFeatures Response:', data);
      return data;
    } catch (error: any) {
      console.error('[API] selectFeatures Error:', error.response?.status, error.response?.data);
      throw error;
    }
  },

  confirm: async (projectId: string, stageType: string): Promise<Stage> => {
    const { data } = await api.put(`/projects/${projectId}/stages/${stageType}/confirm`);
    return data;
  },

  selectPlatform: async (projectId: string, selection: PlatformSelection): Promise<Stage> => {
    const { data } = await api.put(`/projects/${projectId}/stages/platform/select`, selection);
    return data;
  },
};

// Collaborators API
export const collaboratorsApi = {
  list: async (projectId: string): Promise<Collaborator[]> => {
    const { data } = await api.get(`/projects/${projectId}/collaborators`);
    return data;
  },

  invite: async (projectId: string, email: string): Promise<Collaborator> => {
    const { data } = await api.post(`/projects/${projectId}/collaborators`, { email });
    return data;
  },

  remove: async (projectId: string, userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/collaborators/${userId}`);
  },
};

// Notes API
export const notesApi = {
  list: async (stageId: string): Promise<Note[]> => {
    const { data } = await api.get(`/stages/${stageId}/notes`);
    return data;
  },

  create: async (stageId: string, content: string): Promise<Note> => {
    const { data } = await api.post(`/stages/${stageId}/notes`, { content });
    return data;
  },

  update: async (noteId: string, content: string): Promise<Note> => {
    const { data } = await api.put(`/notes/${noteId}`, { content });
    return data;
  },

  delete: async (noteId: string): Promise<void> => {
    await api.delete(`/notes/${noteId}`);
  },
};

export default api;
