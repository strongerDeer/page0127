import { describe, expect, it } from 'vitest';

import { countReadingGenres, parseReadingSocial } from './readingSocial';

describe('독서 소셜 비교', () => {
  it('서재의 대분류로 합치고 미분류와 중복은 점수에서 뺀다', () => {
    expect(
      countReadingGenres([
        '국내도서>소설/시/희곡>소설',
        '소설',
        '인문학>철학',
        '',
        '알 수 없음',
      ])
    ).toEqual(['소설/시/희곡', '인문학']);
  });
  it('본인 기록이 없는 응답은 0점으로 표시하지 않는다', () => {
    expect(() =>
      parseReadingSocial({ year: 2026, genres: [], clashes: [] }, 'me')
    ).toThrow();
  });
  it('분류 없는 정상 기록은 빈 장르로 유지한다', () => {
    expect(
      parseReadingSocial(
        {
          year: 2026,
          genres: [{ user_id: 'me', categories: [] }],
          clashes: [],
        },
        'me'
      )
    ).toEqual({
      year: 2026,
      genres: [{ userId: 'me', categories: [] }],
      clashes: [],
    });
  });
  it('중복 사용자 응답은 거부한다', () => {
    expect(() =>
      parseReadingSocial(
        {
          year: 2026,
          genres: [
            { user_id: 'me', categories: [] },
            { user_id: 'me', categories: [] },
          ],
          clashes: [],
        },
        'me'
      )
    ).toThrow();
  });
});
