import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  calculateBookStats,
  getCurrentLibraryYear,
} from '@/entities/book/model/libraryPeriod';
import { countShelf } from '@/entities/book/model/shelfCounts';

import type { Book } from '@/entities/book/types';

const me = '00000000-0000-0000-0000-000000000001';
const friend = '00000000-0000-0000-0000-000000000002';
const stranger = '00000000-0000-0000-0000-000000000003';
const year = getCurrentLibraryYear();
const db = new PGlite();
type Result = {
  user_id: string;
  library_year: number;
  completed_books: number;
  total_pages: number;
  missing_page_books: number;
  books_rank: number | null;
  pages_rank: number | null;
};

const book = (overrides: Partial<Book> = {}): Book => ({
  id: crypto.randomUUID(),
  user_id: me,
  isbn: 'A',
  title: '책',
  sub_title: null,
  source: null,
  provider_item_id: null,
  thickness_mm: null,
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  description: null,
  pub_date: null,
  category: null,
  page_count: 100,
  toc: null,
  status: 'completed',
  read_count: 1,
  start_date: null,
  completed_date: `${year}-01-01`,
  completed_year: null,
  rating: null,
  is_life_book: false,
  one_line_review: null,
  personal_memo: null,
  tags: null,
  is_public: true,
  created_at: `${year}-01-01T00:00:00Z`,
  updated_at: `${year}-01-01T00:00:00Z`,
  ...overrides,
});

const insertBooks = async (books: Book[]) => {
  for (const b of books) {
    await db.query(
      `INSERT INTO public.books
      (id, user_id, isbn, is_public, status, completed_date, completed_year, page_count, read_count, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        b.id,
        b.user_id,
        b.isbn,
        b.is_public,
        b.status,
        b.completed_date,
        b.completed_year,
        b.page_count,
        b.read_count,
        b.created_at,
      ]
    );
  }
};
const league = async () =>
  (
    await db.query<Result>(
      'SELECT * FROM public.get_following_reading_league()'
    )
  ).rows;

beforeAll(async () => {
  // 외부 DB 없이 실제 마이그레이션과 권한을 검증하는 최소 스키마다.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, username text, nickname text, photo_url text);
    CREATE TABLE public.follows (follower_id uuid, following_id uuid);
    CREATE TABLE public.books (id uuid PRIMARY KEY, user_id uuid, isbn text, is_public boolean,
      status text, completed_date date, completed_year integer, page_count integer,
      read_count integer, created_at timestamptz);
  `);
  const migration = fileURLToPath(
    new URL(
      '../../../../../../supabase/migrations/20261025000002_following_reading_league.sql',
      import.meta.url
    )
  );
  await db.exec(readFileSync(migration, 'utf8'));
}, 30_000);

beforeEach(async () => {
  await db.exec('TRUNCATE public.books, public.follows, public.profiles');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [me]);
  for (const [id, name] of [
    [me, '나'],
    [friend, '친구'],
    [stranger, '다른 사람'],
  ]) {
    await db.query('INSERT INTO public.profiles VALUES ($1,$2,$2,NULL)', [
      id,
      name,
    ]);
  }
});
afterAll(async () => {
  await db.close();
});

describe('팔로잉 독서 리그 RPC', () => {
  it('팔로우 0명이어도 본인은 남고, 0권에는 순위가 없다', async () => {
    expect(await league()).toEqual([
      expect.objectContaining({
        user_id: me,
        library_year: year,
        completed_books: 0,
        total_pages: 0,
        missing_page_books: 0,
        books_rank: null,
        pages_rank: null,
      }),
    ]);
  });

  it('공개 완독·올해·재독 기준이 서재의 권수와 쪽수에 일치한다', async () => {
    const books = [
      book({ completed_date: `${year - 1}-12-31`, page_count: 999 }),
      book(),
      book({ completed_date: `${year}-06-01`, page_count: 300 }),
      book({
        isbn: 'year',
        completed_date: null,
        completed_year: year,
        page_count: 200,
      }),
      book({ isbn: '', page_count: 10 }),
      book({ isbn: '', page_count: 20 }),
      book({ isbn: 'missing', page_count: null }),
      book({ isbn: 'private', is_public: false, page_count: 9999 }),
      book({ isbn: 'reading', status: 'reading', page_count: 9999 }),
      book({ isbn: 'unknown', completed_date: null, page_count: 9999 }),
      // 잘못된 과거 데이터에서도 날짜를 연도보다 우선한다.
      book({
        isbn: 'priority',
        completed_date: `${year - 1}-01-01`,
        completed_year: year,
      }),
    ];
    await insertBooks(books);
    const visible = books.filter(
      (b) => b.is_public && b.status === 'completed'
    );
    const stats = calculateBookStats(visible, year, year);
    expect((await league())[0]).toMatchObject({
      completed_books: countShelf(visible, year).yearBooks,
      total_pages: stats.totalPages,
      missing_page_books: 1,
    });
    expect(stats.totalPages).toBe(530);
  });

  it('팔로잉만 포함하고 공동 순위는 1,1,3이며 0은 순위가 없다', async () => {
    await db.query('INSERT INTO public.follows VALUES ($1,$2),($1,$3)', [
      me,
      friend,
      stranger,
    ]);
    await insertBooks([
      book(),
      book({ user_id: friend }),
      book({ user_id: stranger, page_count: null }),
    ]);
    const rows = await league();
    expect(rows.map((r) => r.books_rank)).toEqual([1, 1, 1]);
    expect(rows.find((r) => r.user_id === stranger)?.pages_rank).toBeNull();
    await db.query(
      'UPDATE public.books SET page_count = 50 WHERE user_id = $1',
      [stranger]
    );
    expect(
      (await league()).find((r) => r.user_id === stranger)?.pages_rank
    ).toBe(3);
    await db.query('DELETE FROM public.follows WHERE following_id = $1', [
      stranger,
    ]);
    expect((await league()).map((r) => r.user_id).sort()).toEqual([me, friend]);
  });

  it('같은 시각 재독의 대표는 입력 순서와 무관하게 서재와 일치한다', async () => {
    const books = [
      book({
        id: '10000000-0000-0000-0000-000000000001',
        read_count: 10,
        completed_date: `${year}-01-01`,
      }),
      book({
        id: '10000000-0000-0000-0000-000000000002',
        read_count: 1,
        completed_date: `${year}-02-01`,
        page_count: 200,
      }),
      book({
        id: '10000000-0000-0000-0000-000000000003',
        read_count: 2,
        completed_date: `${year}-02-01`,
        page_count: 300,
      }),
      book({
        id: '10000000-0000-0000-0000-000000000004',
        read_count: 2,
        completed_date: `${year}-02-01`,
        page_count: 400,
      }),
    ];
    await insertBooks(books);
    expect((await league())[0].total_pages).toBe(400);
    for (const order of [books, [...books].reverse()]) {
      expect(calculateBookStats(order, year, year).totalPages).toBe(400);
    }
  });

  it('익명 실행은 허용하지 않고 세션이 없으면 대상을 반환하지 않는다', async () => {
    const { rows } = await db.query<{ anon: boolean; authenticated: boolean }>(`
      SELECT has_function_privilege('anon', 'public.get_following_reading_league()', 'execute') AS anon,
        has_function_privilege('authenticated', 'public.get_following_reading_league()', 'execute') AS authenticated
    `);
    expect(rows[0]).toEqual({ anon: false, authenticated: true });
    await db.exec("SELECT set_config('request.jwt.claim.sub', '', false)");
    expect(await league()).toEqual([]);
  });

  it('테이블 조회 권한 없이도 로그인 역할이 자신의 모집단만 집계한다', async () => {
    await insertBooks([book(), book({ user_id: friend, page_count: 500 })]);
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [
      friend,
    ]);
    await db.exec('SET ROLE authenticated');
    try {
      expect(await league()).toEqual([
        expect.objectContaining({
          user_id: friend,
          completed_books: 1,
          total_pages: 500,
        }),
      ]);
      await expect(db.query('SELECT * FROM public.books')).rejects.toThrow(
        /permission denied/
      );
    } finally {
      await db.exec('RESET ROLE');
    }
  });
});
