import { describe, expect, it } from 'vitest';

import { toRecapNotice } from './toRecapNotice';

import type { RecapBook } from '../model/types';

const book = (id: string, title: string): RecapBook => ({
  id,
  title,
  author: '저자',
  cover_image: null,
  provider_item_id: null,
  status: 'completed',
  rating: null,
  is_life_book: false,
  completed_date: '2026-10-20',
  created_at: '2026-10-01T00:00:00Z',
});

describe('toRecapNotice', () => {
  it('이번 주 완독 — 여러 권이면 "외 N권"', () => {
    expect(
      toRecapNotice({
        kind: 'this-week',
        variant: 'completed',
        lead: book('a', '데미안'),
        others: [book('b', '수레바퀴 아래서')],
      })
    ).toBe('이번 주에 『데미안』 외 1권 읽기를 마쳤어요. 한 주를 돌아볼까요?');
  });

  it('이번 주 담기 — 한 권이면 "한 권"', () => {
    expect(
      toRecapNotice({
        kind: 'this-week',
        variant: 'added',
        lead: book('a', '데미안'),
        others: [],
      })
    ).toBe('이번 주 서재에 『데미안』 한 권이 새로 담겼어요.');
  });

  it('n년 전 이맘때', () => {
    expect(
      toRecapNotice({
        kind: 'years-ago',
        yearsAgo: 2,
        lead: book('a', '데미안'),
        others: [],
      })
    ).toBe('2년 전 이맘때 『데미안』 읽기를 마쳤어요. 그때를 돌아볼까요?');
  });

  it('읽는 중 카드는 읽는 중 알림과 겹치므로 알리지 않는다', () => {
    expect(
      toRecapNotice({
        kind: 'still-reading',
        lead: book('a', '데미안'),
        others: [],
      })
    ).toBeNull();
  });
});
