import {
  createSkillResponse,
  createErrorResponse,
  animeSkillHandler,
} from '../index';

describe('createSkillResponse', () => {
  it('creates a successful response with data', () => {
    const result = createSkillResponse({ id: '1', title: 'Test Anime' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: '1', title: 'Test Anime' });
    expect(result.error).toBeUndefined();
  });

  it('creates a response with explicit success=false', () => {
    const result = createSkillResponse(null, false);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });
});

describe('createErrorResponse', () => {
  it('creates an error response', () => {
    const result = createErrorResponse('Something went wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
    expect(result.data).toBeUndefined();
  });
});

describe('animeSkillHandler', () => {
  it('returns error response when query is empty', async () => {
    const result = await animeSkillHandler({ query: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Query is required');
  });

  it('returns successful response for a valid query', async () => {
    const result = await animeSkillHandler({ query: 'Naruto' });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});
