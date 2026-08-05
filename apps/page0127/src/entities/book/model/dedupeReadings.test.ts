import { describe, expect, it } from 'vitest';

import { dedupeReadings } from './dedupeReadings';

import type { Book } from '../types';

const createBook = (overrides: Partial<Book> = {}): Book => ({
  id: crypto.randomUUID(),
  user_id: 'user-id',
  isbn: '9788901234567',
  title: '어린 왕자',
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  description: null,
  pub_date: null,
  category: '소설',
  page_count: 100,
  toc: null,
  status: 'completed',
  read_count: 1,
  start_date: null,
  completed_date: '2026-01-01',
  rating: 5,
  is_life_book: false,
  one_line_review: null,
  personal_memo: null,
  tags: null,
  is_public: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('dedupeReadings', () => {
  it('같은 책의 회독 기록은 한 권으로 합친다', () => {
    const books = [
      createBook({ id: 'first', read_count: 1, completed_date: '2026-01-01' }),
      createBook({ id: 'second', read_count: 2, completed_date: '2026-06-01' }),
    ];

    expect(dedupeReadings(books)).toHaveLength(1);
  });

  it('가장 최근에 완독한 회독을 대표로 남긴다', () => {
    const books = [
      createBook({ id: 'first', read_count: 1, completed_date: '2026-01-01' }),
      createBook({ id: 'second', read_count: 2, completed_date: '2026-06-01' }),
    ];

    expect(dedupeReadings(books)[0].id).toBe('second');
  });

  it('완독일이 같으면 회독 수가 큰 쪽을 대표로 남긴다', () => {
    const books = [
      createBook({ id: 'second', read_count: 2, completed_date: '2026-01-01' }),
      createBook({ id: 'first', read_count: 1, completed_date: '2026-01-01' }),
    ];

    expect(dedupeReadings(books)[0].id).toBe('second');
  });

  it('완독일이 없으면 등록 시각으로 최신 회독을 고른다', () => {
    const books = [
      createBook({
        id: 'older',
        completed_date: null,
        created_at: '2026-01-01T00:00:00.000Z',
      }),
      createBook({
        id: 'newer',
        completed_date: null,
        created_at: '2026-06-01T00:00:00.000Z',
      }),
    ];

    expect(dedupeReadings(books)[0].id).toBe('newer');
  });

  it('회독 중 하나라도 인생책이면 합친 결과도 인생책이다', () => {
    // 1회독 때 인생책으로 꼽고 2회독 기록엔 체크를 안 했더라도
    // '내 인생책' 책장에서 사라지면 안 된다
    const books = [
      createBook({ id: 'first', read_count: 1, is_life_book: true }),
      createBook({
        id: 'second',
        read_count: 2,
        is_life_book: false,
        completed_date: '2026-06-01',
      }),
    ];

    const [merged] = dedupeReadings(books);

    expect(merged.id).toBe('second');
    expect(merged.is_life_book).toBe(true);
  });

  it('회독 수는 기록 중 가장 큰 값을 쓴다', () => {
    // 옛 기록을 나중에 등록하는 등으로 대표 회독의 read_count 가
    // 최대가 아닐 수 있다 — 배지는 "몇 번 읽었나"를 말해야 한다
    const books = [
      createBook({ id: 'third', read_count: 3, completed_date: '2026-01-01' }),
      createBook({ id: 'second', read_count: 2, completed_date: '2026-06-01' }),
    ];

    const [merged] = dedupeReadings(books);

    expect(merged.id).toBe('second');
    expect(merged.read_count).toBe(3);
  });

  it('저장된 회독 수가 모두 1이어도 기록이 2개면 2회독으로 센다', () => {
    // read_count 는 등록 시점에 한 번 정해진다 — 중복 감지(getBookByISBN)가
    // ISBN 표기 차이로 빗나가면 둘 다 1 로 남는다. 나중에 ISBN 을 맞춰
    // 합쳐지더라도 그 값은 따라오지 않아 배지가 영영 안 붙는다.
    // 같은 칸에 같은 책 기록이 2개 있다는 것 자체가 2회독이다.
    const books = [
      createBook({ id: 'first', read_count: 1, completed_date: '2025-09-12' }),
      createBook({ id: 'second', read_count: 1, completed_date: '2026-05-08' }),
    ];

    const [merged] = dedupeReadings(books);

    expect(merged.id).toBe('second');
    expect(merged.read_count).toBe(2);
  });

  it('저장된 회독 수가 기록 수보다 크면 저장된 값을 쓴다', () => {
    // 재독 다이얼로그로 제대로 등록해 read_count 가 3 인데 그 해에 읽은
    // 기록만 화면에 남은 경우 — 세는 값(1)으로 덮으면 회독 수가 되레 줄어든다
    const books = [createBook({ id: 'only', read_count: 3 })];

    expect(dedupeReadings(books)[0].read_count).toBe(3);
  });

  it('서로 다른 책은 합치지 않고 원래 순서를 지킨다', () => {
    const books = [
      createBook({ id: 'a', isbn: '111' }),
      createBook({ id: 'b', isbn: '222' }),
      createBook({ id: 'c', isbn: '333' }),
    ];

    expect(dedupeReadings(books).map((book) => book.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('대표를 고른 뒤에도 목록에서의 원래 자리를 유지한다', () => {
    // 정렬(완독 최신순 등)은 호출부가 이미 끝낸 상태로 들어온다.
    // 합치면서 순서를 흐트러뜨리면 책장 정렬이 무너진다.
    const books = [
      createBook({ id: 'newer', isbn: '111', completed_date: '2026-06-01' }),
      createBook({ id: 'other', isbn: '222', completed_date: '2026-03-01' }),
      createBook({ id: 'older', isbn: '111', completed_date: '2026-01-01' }),
    ];

    expect(dedupeReadings(books).map((book) => book.id)).toEqual([
      'newer',
      'other',
    ]);
  });

  it('ISBN 이 없는 책은 서로 다른 책으로 본다', () => {
    // 수기 등록 등으로 ISBN 이 비어 있으면 제목이 달라도 키가 같아져
    // 엉뚱한 책끼리 합쳐진다 → id 로 갈라둔다
    const books = [
      createBook({ id: 'a', isbn: '', title: '직접 쓴 책 1' }),
      createBook({ id: 'b', isbn: '', title: '직접 쓴 책 2' }),
    ];

    expect(dedupeReadings(books)).toHaveLength(2);
  });

  it('재독 중이면 완독한 회독과 읽는 중인 회독을 합치지 않는다', () => {
    // 합쳐서 '읽는 중'만 남기면 이미 완독한 기록이 완독 책장에서 사라진다
    const books = [
      createBook({ id: 'done', read_count: 1, status: 'completed' }),
      createBook({
        id: 'reading',
        read_count: 2,
        status: 'reading',
        completed_date: null,
      }),
    ];

    expect(dedupeReadings(books)).toHaveLength(2);
  });

  it('사용자가 다르면 합치지 않는다', () => {
    // 공개 서재 목록처럼 여러 사람의 책이 섞인 배열에 쓰여도
    // 남의 기록과 뭉뚱그려지면 안 된다
    const books = [
      createBook({ id: 'mine', user_id: 'me' }),
      createBook({ id: 'yours', user_id: 'you' }),
    ];

    expect(dedupeReadings(books)).toHaveLength(2);
  });

  it('빈 목록은 빈 목록으로 돌려준다', () => {
    expect(dedupeReadings([])).toEqual([]);
  });
});
