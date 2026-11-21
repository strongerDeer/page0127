import { describe, expect, it } from 'vitest';

import daeonsil from './__fixtures__/daeonsil.json';
import {
  bookGuideSectionsSchema,
  parseBookGuideSections,
} from './bookGuideSchema';

/**
 * 가이드는 JSONB 라 DB 가 모양을 지켜 주지 않는다. 여기 규칙이 유일한 문지기다.
 * 샘플은 인스타에 올린 『대온실 수리 보고서』 카드 9장을 옮긴 것이다.
 */
describe('bookGuideSectionsSchema', () => {
  it('대온실 수리 보고서 샘플을 통과시킨다', () => {
    const result = bookGuideSectionsSchema.safeParse(daeonsil);
    expect(result.success).toBe(true);
  });

  it('관계선이 없는 인물을 가리키면 그 위치와 함께 막는다', () => {
    const result = bookGuideSectionsSchema.safeParse([
      {
        type: 'people',
        title: '사람들',
        leads: [{ id: 'a', name: '가' }],
        groups: [],
        links: [{ from: 'a', to: 'ghost', label: '친구', kind: 'bond' }],
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([0, 'links', 0, 'to']);
  });

  it('같은 가이드 안에서 인물 id가 겹치면 막는다', () => {
    const result = bookGuideSectionsSchema.safeParse([
      {
        type: 'people',
        title: '사람들',
        leads: [{ id: 'a', name: '가' }],
        groups: [{ name: '모임', members: [{ id: 'a', name: '나' }] }],
        links: [],
      },
    ]);

    expect(result.success).toBe(false);
  });

  it('모르는 섹션 종류는 받지 않는다', () => {
    expect(
      bookGuideSectionsSchema.safeParse([{ type: 'ending', title: '결말' }])
        .success
    ).toBe(false);
  });
});

describe('parseBookGuideSections', () => {
  it('깨진 값이면 null — 페이지는 가이드만 숨기고 계속 그린다', () => {
    expect(parseBookGuideSections({ not: 'array' })).toBeNull();
    expect(parseBookGuideSections([])).toBeNull();
  });
});
