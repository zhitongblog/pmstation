// User types
export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Project types
export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'archived' | 'deleted';
  current_stage: StageType;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithStages extends Project {
  stages: StageInfo[];
}

export interface StageInfo {
  id: string;
  type: StageType;
  status: StageStatus;
  version: number;
}

// Stage types
export type StageType = 'idea' | 'direction' | 'platform' | 'features' | 'demo' | 'prd' | 'testcases';
export type StageStatus = 'pending' | 'generating' | 'completed' | 'confirmed';

// Platform types
export interface PlatformSelection {
  platforms: string[];
  pc_type?: 'full' | 'admin';
  mobile_type?: 'full' | 'user';
}

export interface Stage {
  id: string;
  project_id: string;
  type: StageType;
  status: StageStatus;
  input_data: Record<string, any> | null;
  output_data: Record<string, any> | null;
  selected_option: Record<string, any> | null;
  version: number;
  created_at: string;
  updated_at: string;
}

// Direction types
export interface Direction {
  id: number;
  title: string;
  positioning: string;
  target_users: string;
  value_proposition: string;
  market_opportunity?: string;
  competitors: string[];
  success_factors: string[];
  risks: string[];
}

// Feature types
export interface Feature {
  id: number;
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  platforms?: ('pc' | 'mobile')[];
  sub_features?: Feature[];
  selected: boolean;
}

// Collaborator types
export interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: 'viewer';
  invited_at: string;
  accepted_at: string | null;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
}

// Note types
export interface Note {
  id: string;
  stage_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar: string | null;
}

// API response types
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
