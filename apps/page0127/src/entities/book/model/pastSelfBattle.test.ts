import { describe, expect, it } from 'vitest';

import {
  calculatePastSelfHistory,
  getDefaultPastSelfPeriod,
  getPastSelfRanges,
} from './pastSelfBattle';

import type { PastSelfRow } from './pastSelfBattle';
let id = 0;
const row = (values: Partial<PastSelfRow> = {}): PastSelfRow => ({
  id: String(++id),
  user_id: 'me',
  isbn: '',
  status: 'completed',
  is_public: true,
  completed_date: '2026-10-03',
  completed_year: null,
  created_at: '2026-10-03T00:00:00Z',
  read_count: 1,
  is_life_book: false,
  page_count: 300,
  ...values,
});
describe('지난 나와 비교 기간', () => {
  it('지난달과 작년의 같은 날짜까지 비교한다', () => {
    expect(getPastSelfRanges('2026-10-26')).toEqual({
      month: {
        current: { from: '2026-10-01', to: '2026-10-26' },
        previous: { from: '2026-09-01', to: '2026-09-26' },
      },
      year: {
        current: { from: '2026-01-01', to: '2026-10-26' },
        previous: { from: '2025-01-01', to: '2025-10-26' },
      },
    });
  });
  it('1월의 지난달은 작년 12월이다', () =>
    expect(getPastSelfRanges('2026-01-01').month.previous).toEqual({
      from: '2025-12-01',
      to: '2025-12-01',
    }));
  it('말일과 윤년 2월의 없는 날짜만 보정한다', () => {
    expect(getPastSelfRanges('2026-03-31').month.previous.to).toBe(
      '2026-02-28'
    );
    expect(getPastSelfRanges('2024-03-31').month.previous.to).toBe(
      '2024-02-29'
    );
    expect(getPastSelfRanges('2024-02-29').year.previous.to).toBe('2023-02-28');
  });
  it('서버 현지 시간이 아닌 서울 날짜를 쓴다', () => {
    const date = new Date('2026-10-25T15:00:00Z');
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    expect(getPastSelfRanges(today).month.current.to).toBe('2026-10-26');
  });
  it('잘못된 날짜를 조용히 다른 날로 바꾸지 않는다', () =>
    expect(() => getPastSelfRanges('2026-02-30')).toThrow());
});
describe('지난 나와 배틀 집계', () => {
  it('기간을 자른 뒤 ISBN 재독을 합치며 같은 책은 양쪽 기간에 각각 센다', () => {
    const history = calculatePastSelfHistory(
      [
        row({ isbn: 'same', completed_date: '2026-09-01', page_count: 100 }),
        row({ isbn: 'same', completed_date: '2026-09-26', page_count: 200 }),
        row({ isbn: 'same', completed_date: '2026-10-01', page_count: 300 }),
        row({ isbn: 'same', completed_date: '2026-10-26', page_count: 400 }),
      ],
      'me',
      '2026-10-26'
    );
    expect(history.month.current).toMatchObject({
      completedBooks: 1,
      totalPages: 400,
    });
    expect(history.month.previous).toMatchObject({
      completedBooks: 1,
      totalPages: 200,
    });
    expect(history.year.current).toMatchObject({
      completedBooks: 1,
      totalPages: 400,
    });
  });
  it('비공개·진행 중·타인·아직 오지 않은 날짜는 포함하지 않는다', () => {
    const history = calculatePastSelfHistory(
      [
        row(),
        row({ is_public: false }),
        row({ status: 'reading' }),
        row({ user_id: 'other' }),
        row({ completed_date: '2026-10-27' }),
        row({ completed_date: '2026-09-27' }),
      ],
      'me',
      '2026-10-26'
    );
    expect(history.month.current.completedBooks).toBe(1);
    expect(history.month.previous.completedBooks).toBe(0);
    expect(history.year.current.completedBooks).toBe(2);
  });
  it('ISBN 없는 책은 ID로 구분하고 쪽수 미상도 권수에는 포함한다', () => {
    const history = calculatePastSelfHistory(
      [row(), row({ page_count: null })],
      'me',
      '2026-10-26'
    );
    expect(history.month.current).toMatchObject({
      completedBooks: 2,
      totalPages: 300,
      missingPageBooks: 1,
    });
  });
  it('연도만 있는 기록은 승패 점수에 섞지 않고 구분한다', () => {
    const history = calculatePastSelfHistory(
      [
        row({ completed_date: null, completed_year: 2025 }),
        row({ completed_date: null, completed_year: 2026 }),
        row({ completed_date: '2026-10-10', completed_year: 2025 }),
      ],
      'me',
      '2026-10-26'
    );
    expect(history.year.previous).toMatchObject({
      completedBooks: 0,
      totalPages: 0,
      undatedBooks: 1,
    });
    expect(history.year.current).toMatchObject({
      completedBooks: 1,
      undatedBooks: 1,
    });
  });
  it('날짜가 확인된 같은 책이 기간 안에 있으면 미상 회독을 중복 경고하지 않는다', () => {
    const history = calculatePastSelfHistory(
      [
        row({ isbn: 'same' }),
        row({ isbn: 'same', completed_date: null, completed_year: 2026 }),
      ],
      'me',
      '2026-10-26'
    );
    expect(history.month.current.undatedBooks).toBe(0);
  });
  it('같은 날 재독의 대표 쪽수도 서재의 회독 수·ID 규칙을 따른다', () => {
    const history = calculatePastSelfHistory(
      [
        row({ id: 'a', isbn: 'same', page_count: 10, read_count: 1 }),
        row({ id: 'b', isbn: 'same', page_count: 20, read_count: 2 }),
        row({ id: 'c', isbn: 'same', page_count: 30, read_count: 2 }),
      ],
      'me',
      '2026-10-26'
    );
    expect(history.month.current.totalPages).toBe(30);
  });
  it('지난달 기록이 없으면 비교할 수 있는 작년을 먼저 연다', () => {
    const history = calculatePastSelfHistory(
      [row({ completed_date: '2025-05-01' })],
      'me',
      '2026-10-26'
    );
    expect(getDefaultPastSelfPeriod(history)).toBe('year');
  });
});
