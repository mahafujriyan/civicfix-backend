import { describe, expect, it } from 'vitest';
import { getPaginationMeta, getSkipTake, paginationSchema } from '../src/utils/pagination';

describe('pagination helpers', () => {
  it('calculates skip/take correctly', () => {
    expect(getSkipTake(1, 10)).toEqual({ skip: 0, take: 10 });
    expect(getSkipTake(3, 20)).toEqual({ skip: 40, take: 20 });
  });

  it('builds meta with total pages', () => {
    expect(getPaginationMeta(1, 10, 95)).toEqual({
      page: 1,
      limit: 10,
      total: 95,
      totalPages: 10,
    });
  });

  it('rejects limit above max', () => {
    const parsed = paginationSchema.safeParse({ page: 1, limit: 500 });
    expect(parsed.success).toBe(false);
  });

  it('applies defaults', () => {
    const parsed = paginationSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
    expect(parsed.sortOrder).toBe('desc');
  });
});
