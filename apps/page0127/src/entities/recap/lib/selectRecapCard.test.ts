import { describe, expect, it } from 'vitest';

import { selectRecapCard } from './selectRecapCard';

import type { RecapBook } from '../model/types';

/** 기준 시각 — 2026-07-28(화). 그 주는 07-27(월)~08-02(일) */
const NOW = new Date('2026-07-28T03:00:00Z');

/** 테스트용 책 한 권. 지정하지 않은 칸은 "아무 카드에도 안 걸리는" 값이다 */
const book = (over: Partial<RecapBook> & { id: string }): RecapBook => ({
  title: '테스트 책',
  author: null,
  cover_image: null,
  status: 'completed',
  rating: null,
  completed_date: null,
  // 2020년 등록 = 이번 주도 아니고 기념일 언저리도 아니다
  created_at: '2020-03-05T00:00:00Z',
  ...over,
});

describe('selectRecapCard', () => {
  it('1) 이번 주에 완독한 책이 있으면 이번 주 카드를 끝냈다로 준다', () => {
    const card = selectRecapCard(
      [book({ id: 'a', completed_date: '2026-07-28' })],
      NOW
    );

    expect(card?.kind).toBe('this-week');
    expect(card).toMatchObject({ variant: 'completed' });
    expect(card?.lead.id).toBe('a');
  });

  it('2) 이번 주에 담기만 했으면 이번 주 카드를 담았다로 준다', () => {
    const card = selectRecapCard(
      [
        book({
          id: 'a',
          status: 'reading',
          created_at: '2026-07-28T01:00:00Z',
        }),
      ],
      NOW
    );

    expect(card).toMatchObject({ kind: 'this-week', variant: 'added' });
    expect(card?.lead.id).toBe('a');
  });

  it('3) 이번 주가 비었고 작년 이맘때 완독이 있으면 그 해 카드를 준다', () => {
    const card = selectRecapCard(
      [book({ id: 'a', completed_date: '2025-07-30' })],
      NOW
    );

    expect(card).toMatchObject({ kind: 'years-ago', yearsAgo: 1 });
    expect(card?.lead.id).toBe('a');
  });

  it('4) 작년이 비어 있으면 더 거슬러 올라가고 몇 년 전인지 담는다', () => {
    const card = selectRecapCard(
      [book({ id: 'a', completed_date: '2023-07-26' })],
      NOW
    );

    expect(card).toMatchObject({ kind: 'years-ago', yearsAgo: 3 });
  });

  it('5) 앞의 것이 다 없으면 읽는 중인 책을 준다', () => {
    const card = selectRecapCard([book({ id: 'a', status: 'reading' })], NOW);

    expect(card).toMatchObject({ kind: 'still-reading' });
    expect(card?.lead.id).toBe('a');
  });

  it('6) 할 말이 없으면 카드를 만들지 않는다', () => {
    // 완독일이 기념일에서 멀고, 읽는 중도 아니다
    const card = selectRecapCard(
      [book({ id: 'a', completed_date: '2025-01-15' })],
      NOW
    );

    expect(card).toBeNull();
  });

  it('7) 같은 입력이면 몇 번을 불러도 같은 결과다', () => {
    const books = [
      book({ id: 'b', completed_date: '2025-07-29' }),
      book({ id: 'a', completed_date: '2025-07-27' }),
      book({ id: 'c', completed_date: '2025-08-01' }),
    ];

    const first = selectRecapCard(books, NOW);
    const second = selectRecapCard(books, NOW);

    expect(first).toEqual(second);
  });

  it('8) 기념일과의 거리가 같으면 id 오름차순으로 안정되게 고른다', () => {
    // 기념일은 2025-07-28. 07-27 과 07-29 는 둘 다 하루 차이다.
    // 입력 순서를 뒤집어도 같은 책이 대표여야 한다.
    const forward = selectRecapCard(
      [
        book({ id: 'zzz', completed_date: '2025-07-27' }),
        book({ id: 'aaa', completed_date: '2025-07-29' }),
      ],
      NOW
    );
    const reversed = selectRecapCard(
      [
        book({ id: 'aaa', completed_date: '2025-07-29' }),
        book({ id: 'zzz', completed_date: '2025-07-27' }),
      ],
      NOW
    );

    expect(forward?.lead.id).toBe('aaa');
    expect(reversed?.lead.id).toBe('aaa');
  });

  it('9) UTC 일요일 16시는 KST 로 새 주라, 지난 주 완독은 이번 주가 아니다', () => {
    // UTC 2026-08-02 16:00(일) === KST 2026-08-03 01:00(월) → 이번 주는 08-03~08-09
    const card = selectRecapCard(
      [book({ id: 'a', completed_date: '2026-08-01' })],
      new Date('2026-08-02T16:00:00Z')
    );

    // 08-01 은 지난 주다. 기념일(2025-08-03) 근처도 아니고 읽는 중도 아니므로 null 이다.
    //
    // not.toBe('this-week') 로 쓰지 않는 이유: 그 단언은 selectRecapCard 가 무조건
    // null 만 돌려주는 망가진 구현도 통과시킨다. 정확한 기대값을 적어야 검증이 된다.
    expect(card).toBeNull();
  });

  it('이번 주에 완독과 등록이 둘 다 있으면 완독을 보여준다', () => {
    const card = selectRecapCard(
      [
        book({
          id: 'added',
          status: 'reading',
          created_at: '2026-07-28T01:00:00Z',
        }),
        book({ id: 'done', completed_date: '2026-07-27' }),
      ],
      NOW
    );

    expect(card).toMatchObject({ kind: 'this-week', variant: 'completed' });
    expect(card?.lead.id).toBe('done');
  });

  it('같은 주의 나머지 책은 others 에 담는다', () => {
    const card = selectRecapCard(
      [
        book({ id: 'a', completed_date: '2025-07-28' }),
        book({ id: 'b', completed_date: '2025-07-30' }),
        book({ id: 'c', completed_date: '2025-07-24' }),
      ],
      NOW
    );

    expect(card?.lead.id).toBe('a'); // 기념일 당일
    expect(card?.others.map((b) => b.id)).toEqual(['b', 'c']); // 2일 차, 4일 차
  });

  it('책이 하나도 없으면 null 이다', () => {
    expect(selectRecapCard([], NOW)).toBeNull();
  });
});
