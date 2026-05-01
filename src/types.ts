export interface AnimeInfo {
  id: string;
  title: string;
  genre: string[];
  episodes: number;
  status: 'ongoing' | 'completed' | 'upcoming';
  rating?: number;
  description?: string;
}

export interface SkillRequest {
  query: string;
  context?: Record<string, unknown>;
}

export interface SkillResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SkillHandler<TRequest = SkillRequest, TResponse = unknown> = (
  request: TRequest
) => Promise<SkillResponse<TResponse>>;
