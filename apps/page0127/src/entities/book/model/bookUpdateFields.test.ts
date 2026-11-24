import { describe, expect, it } from 'vitest';

import { pickBookUpdate } from './bookUpdateFields';

describe('pickBookUpdate', () => {
  it('허용한 칸만 남기고 화면에 없는 칸은 버린다', () => {
    expect(
      pickBookUpdate({
        rating: 5,
        status: 'completed',
        is_public: false,
        id: 'other-id',
        user_id: 'someone-else',
        created_at: '2000-01-01',
        catalog_review_status: 'approved',
        requested_public: true,
      })
    ).toEqual({ rating: 5, status: 'completed', is_public: false });
  });

  it('null 로 지우는 값은 그대로 넘긴다(날짜·책등 지우기)', () => {
    expect(
      pickBookUpdate({ completed_date: null, spine_image: null })
    ).toEqual({ completed_date: null, spine_image: null });
  });

  it('객체가 아니면 빈 객체', () => {
    expect(pickBookUpdate(null)).toEqual({});
    expect(pickBookUpdate('rating=5')).toEqual({});
    expect(pickBookUpdate([1, 2])).toEqual({});
  });

  it('프로토타입에서 온 값은 고르지 않는다', () => {
    const body = Object.create({ rating: 5 }) as Record<string, unknown>;
    expect(pickBookUpdate(body)).toEqual({});
  });
});
