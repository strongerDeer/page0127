import { describe, expect, it } from 'vitest';

import {
  buildRecapArchive,
  toWeekRangeLabel,
  toWeeksAgoLabel,
} from './buildRecapArchive';

import type { RecapBook } from '../model/types';

/** 기준 시각 — 2026-07-28(화) 12:00 KST. 이번 주는 07-27~08-02, 지난주는 07-20~07-26 */
const NOW = new Date('2026-07-28T03:00:00Z');

const book = (over: Partial<RecapBook> & { id: string }): RecapBook => ({
  title: '테스트 책',
  author: null,
  cover_image: null,
  provider_item_id: null,
  status: 'completed',
  rating: null,
  is_life_book: false,
  completed_date: null,
  created_at: '2020-03-05T00:00:00Z',
  ...over,
});

describe('buildRecapArchive', () => {
  it('이번 주부터 센다 — 회상 카드에서 "지난 회상"을 눌러도 방금 본 책이 있다', () => {
    const archive = buildRecapArchive(
      [
        book({ id: 'this-week', completed_date: '2026-07-27' }),
        book({ id: 'last-week', completed_date: '2026-07-26' }),
      ],
      NOW
    );

    expect(archive).toHaveLength(2);
    expect(archive[0]).toMatchObject({
      startKey: '2026-07-27',
      endKey: '2026-08-02',
      weeksAgo: 0,
    });
    expect(archive[0].completed.map((b) => b.id)).toEqual(['this-week']);
    expect(archive[1]).toMatchObject({
      startKey: '2026-07-20',
      endKey: '2026-07-26',
      weeksAgo: 1,
    });
    expect(archive[1].completed.map((b) => b.id)).toEqual(['last-week']);
  });

  it('이번 주에 읽고 싶어요로 담은 책도 이번 주 담음에 들어간다', () => {
    const [week] = buildRecapArchive(
      [
        book({
          id: 'wish',
          status: 'want_to_read',
          created_at: '2026-07-27T05:00:00Z',
        }),
      ],
      NOW
    );

    expect(week).toMatchObject({ weeksAgo: 0 });
    expect(week.added.map((b) => b.id)).toEqual(['wish']);
  });

  it('아무 일 없던 주는 뺀다', () => {
    const archive = buildRecapArchive(
      [
        book({ id: 'a', completed_date: '2026-07-22' }),
        book({ id: 'b', completed_date: '2026-07-01' }),
      ],
      NOW
    );

    expect(archive.map((w) => w.weeksAgo)).toEqual([1, 4]);
  });

  it('완독은 완독일 최신순, 같은 날이면 id 순', () => {
    const [week] = buildRecapArchive(
      [
        book({ id: 'b', completed_date: '2026-07-21' }),
        book({ id: 'c', completed_date: '2026-07-24' }),
        book({ id: 'a', completed_date: '2026-07-21' }),
      ],
      NOW
    );

    expect(week.completed.map((b) => b.id)).toEqual(['c', 'a', 'b']);
  });

  it('같은 주에 담고 완독한 책은 완독에만 둔다', () => {
    const [week] = buildRecapArchive(
      [
        book({
          id: 'both',
          completed_date: '2026-07-23',
          created_at: '2026-07-21T01:00:00Z',
        }),
        book({
          id: 'added',
          status: 'reading',
          created_at: '2026-07-22T01:00:00Z',
        }),
      ],
      NOW
    );

    expect(week.completed.map((b) => b.id)).toEqual(['both']);
    expect(week.added.map((b) => b.id)).toEqual(['added']);
  });

  it('담은 날은 KST 로 자른다 — 월요일 새벽(UTC 일요일)은 그 주에 든다', () => {
    const archive = buildRecapArchive(
      [
        book({
          id: 'monday-dawn',
          status: 'reading',
          // 2026-07-20(월) 08:00 KST = 2026-07-19(일) 23:00 UTC
          created_at: '2026-07-19T23:00:00Z',
        }),
      ],
      NOW
    );

    expect(archive[0]).toMatchObject({ startKey: '2026-07-20', weeksAgo: 1 });
  });

  it('정해진 주 수보다 오래된 기록은 넣지 않는다', () => {
    const archive = buildRecapArchive(
      [book({ id: 'old', completed_date: '2026-04-01' })],
      NOW,
      12
    );

    expect(archive).toEqual([]);
  });
});

describe('toWeekRangeLabel', () => {
  it('같은 달', () => {
    expect(
      toWeekRangeLabel({ startKey: '2026-10-13', endKey: '2026-10-19' }, 2026)
    ).toBe('10월 13일 – 19일');
  });

  it('달이 걸치면 끝에도 달을 적는다', () => {
    expect(
      toWeekRangeLabel({ startKey: '2026-09-29', endKey: '2026-10-05' }, 2026)
    ).toBe('9월 29일 – 10월 5일');
  });

  it('올해가 아니면 연도를 붙인다', () => {
    expect(
      toWeekRangeLabel({ startKey: '2025-12-29', endKey: '2026-01-04' }, 2026)
    ).toBe('2025년 12월 29일 – 2026년 1월 4일');
  });
});

describe('toWeeksAgoLabel', () => {
  it('0주 전은 이번 주, 1주 전은 지난주라고 부른다', () => {
    expect(toWeeksAgoLabel(0)).toBe('이번 주');
    expect(toWeeksAgoLabel(1)).toBe('지난주');
    expect(toWeeksAgoLabel(3)).toBe('3주 전');
  });
});
