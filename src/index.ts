import { AnimeInfo, SkillHandler, SkillRequest, SkillResponse } from './types';

export function createSkillResponse<T>(
  data: T,
  success = true
): SkillResponse<T> {
  return { success, data };
}

export function createErrorResponse(error: string): SkillResponse<never> {
  return { success: false, error };
}

export const animeSkillHandler: SkillHandler<SkillRequest, AnimeInfo[]> =
  async (request) => {
    if (!request.query) {
      return createErrorResponse('Query is required');
    }
    return createSkillResponse<AnimeInfo[]>([]);
  };

export { AnimeInfo, SkillHandler, SkillRequest, SkillResponse };
