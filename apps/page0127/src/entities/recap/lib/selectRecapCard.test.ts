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
  is_life_book: false,
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
    // 이번 주(2026-07-27~08-02)를 3년 전으로 밀면 2023-07-27~08-02.
    // 07-30 은 그 구간 안이다.
    const card = selectRecapCard(
      [book({ id: 'a', completed_date: '2023-07-30' })],
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

  it('8) 완독일이 같으면 id 오름차순으로 안정되게 고른다', () => {
    // 대표는 "그 주 시작일과의 차이"로 고른다. 완독일이 같으면 차이도 같아
    // 진짜 동점이 난다 — 입력 순서를 뒤집어도 같은 책이 대표여야 한다.
    const forward = selectRecapCard(
      [
        book({ id: 'zzz', completed_date: '2025-07-29' }),
        book({ id: 'aaa', completed_date: '2025-07-29' }),
      ],
      NOW
    );
    const reversed = selectRecapCard(
      [
        book({ id: 'aaa', completed_date: '2025-07-29' }),
        book({ id: 'zzz', completed_date: '2025-07-29' }),
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
    // 1년 전 이번 주는 2025-07-27~08-02. 대표는 그 구간 시작일에 가장
    // 가까운 책, 나머지는 가까운 순으로 뒤에 붙는다.
    const card = selectRecapCard(
      [
        book({ id: 'a', completed_date: '2025-07-27' }),
        book({ id: 'b', completed_date: '2025-07-29' }),
        book({ id: 'c', completed_date: '2025-08-01' }),
      ],
      NOW
    );

    expect(card?.lead.id).toBe('a'); // 그 주 시작일
    expect(card?.others.map((b) => b.id)).toEqual(['b', 'c']); // 2일 차, 5일 차
  });

  it('책이 하나도 없으면 null 이다', () => {
    expect(selectRecapCard([], NOW)).toBeNull();
  });

  it('그 해, 이 주의 나 — 같은 주 안에서는 오늘이 며칠이든 같은 카드가 나온다', () => {
    // 이번 주(2026-07-27 월~08-02 일)를 1년 전으로 밀면 2025-07-27~08-02.
    // a(07-28)·b(08-01) 둘 다 그 구간 안이라 대표는 시작일에 더 가까운 a다.
    //
    // 고치기 전 버그: 앵커를 "오늘"로 잡았다. 화요일(오늘=07-28)엔 앵커가
    // 2025-07-28 이라 a(0일 차)가 b(4일 차)를 이겨 대표가 됐지만, 일요일
    // (오늘=08-02)엔 앵커가 2025-08-02 로 옮겨가 b(1일 차)가 a(5일 차)를
    // 이겨 대표가 바뀌었다 — 같은 주인데 새로고침 요일에 따라 카드가
    // 달라진 것. 앵커를 "이번 주"로 고정해 이제는 같다.
    const books = [
      book({ id: 'a', completed_date: '2025-07-28' }),
      book({ id: 'b', completed_date: '2025-08-01' }),
    ];

    const tuesday = selectRecapCard(books, new Date('2026-07-28T03:00:00Z'));
    const sunday = selectRecapCard(books, new Date('2026-08-02T03:00:00Z'));

    expect(tuesday?.lead.id).toBe(sunday?.lead.id);
    expect(tuesday).toMatchObject({ kind: 'years-ago', yearsAgo: 1 });
    expect(sunday).toMatchObject({ kind: 'years-ago', yearsAgo: 1 });
  });

  it('그 해, 이 주의 나가 아직 읽는 중보다 우선한다', () => {
    const card = selectRecapCard(
      [
        book({ id: 'ago', completed_date: '2025-07-29' }), // 1년 전 이번 주
        book({ id: 'reading', status: 'reading' }),
      ],
      NOW
    );

    expect(card?.kind).toBe('years-ago');
  });
});
