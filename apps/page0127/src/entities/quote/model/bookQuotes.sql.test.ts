import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * 책 문장 기록 규칙(20261109000100_book_quotes.sql)을 실제 SQL 로 확인한다.
 * Supabase 의 auth 스키마·authenticated 역할은 필요한 만큼만 흉내 낸다.
 */
const db = new PGlite();
const me = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';

const migration = (name: string) =>
  readFileSync(
    new URL(`../../../../../../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  );

/** 그 사용자로 로그인한 것처럼 — RLS 는 authenticated 역할에서만 걸린다 */
const asUser = (uid: string) =>
  db.exec(
    `RESET ROLE; SELECT set_config('test.uid','${uid}',false); SET ROLE authenticated;`
  );
const asAdmin = () => db.exec('RESET ROLE;');

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
    CREATE TABLE public.books(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, isbn text NOT NULL,
      title text, created_at timestamptz DEFAULT now());
    ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "own books" ON public.books FOR SELECT USING (auth.uid() = user_id);
    GRANT SELECT ON public.books TO authenticated;
  `);
  await db.exec(migration('20261109000100_book_quotes.sql'));
  // Supabase 는 public 테이블 권한을 기본으로 준다 — 실제로 막는 것은 RLS 다
  await db.exec(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_quotes TO authenticated;'
  );
});
afterAll(() => db.close());
beforeEach(async () => {
  await asAdmin();
  await db.exec(`
    DELETE FROM public.book_quotes; DELETE FROM public.books; DELETE FROM auth.users;
    INSERT INTO auth.users VALUES ('${me}'),('${other}');
    INSERT INTO public.books(user_id,isbn,title,created_at) VALUES
      ('${me}','111','1회독','2026-01-01'),
      ('${me}','111','2회독','2026-06-01'),
      ('${other}','222','남의 책','2026-01-01');
    INSERT INTO public.book_quotes(user_id,isbn,text,page) VALUES
      ('${me}','111','내 문장',12),
      ('${other}','222','남의 문장',NULL);
  `);
});

describe('book_quotes RLS', () => {
  it('내 문장만 보인다', async () => {
    await asUser(me);
    const { rows } = await db.query<{ text: string }>(
      'SELECT text FROM public.book_quotes'
    );
    expect(rows.map((row) => row.text)).toEqual(['내 문장']);
  });

  it('남의 이름으로는 적을 수 없다', async () => {
    await asUser(me);
    await expect(
      db.query(
        `INSERT INTO public.book_quotes(user_id,isbn,text) VALUES ($1,'222','끼워 넣기')`,
        [other]
      )
    ).rejects.toThrow();
  });

  it('남의 문장은 고치거나 지워지지 않는다', async () => {
    await asUser(me);
    await db.exec(
      `UPDATE public.book_quotes SET text='바꿈' WHERE user_id='${other}'`
    );
    await db.exec(`DELETE FROM public.book_quotes WHERE user_id='${other}'`);
    await asAdmin();
    const { rows } = await db.query<{ text: string }>(
      `SELECT text FROM public.book_quotes WHERE user_id = $1`,
      [other]
    );
    expect(rows).toEqual([{ text: '남의 문장' }]);
  });
});

describe('book_quotes 글자 수', () => {
  it('200자까지 받고, 넘거나 공백뿐이면 막는다', async () => {
    await asUser(me);
    const insert = (text: string) =>
      db.query(
        `INSERT INTO public.book_quotes(user_id,isbn,text) VALUES ($1,'111',$2)`,
        [me, text]
      );
    await expect(insert('가'.repeat(200))).resolves.toBeDefined();
    // 이모지도 한 글자 — 폼의 countQuoteChars 와 같은 기준
    await expect(insert('😀'.repeat(200))).resolves.toBeDefined();
    await expect(insert('가'.repeat(201))).rejects.toThrow();
    await expect(insert('   ')).rejects.toThrow();
  });
});

describe('random_book_quote', () => {
  it('내 문장 중에서만 고르고, 제목·링크는 그 ISBN 의 최신 회독에서 가져온다', async () => {
    await asUser(me);
    const { rows } = await db.query<{
      text: string;
      page: number;
      title: string;
    }>('SELECT text, page, title FROM public.random_book_quote()');
    expect(rows).toEqual([{ text: '내 문장', page: 12, title: '2회독' }]);
  });

  it('기록을 모두 지워도 문장은 남고, 제목 없이 나온다', async () => {
    await asAdmin();
    await db.exec(`DELETE FROM public.books WHERE user_id='${me}'`);
    await asUser(me);
    const { rows } = await db.query<{ text: string; book_id: string | null }>(
      'SELECT text, book_id FROM public.random_book_quote()'
    );
    expect(rows).toEqual([{ text: '내 문장', book_id: null }]);
  });

  it('문장이 없으면 아무것도 돌려주지 않는다', async () => {
    await asAdmin();
    await db.exec(`DELETE FROM public.book_quotes WHERE user_id='${me}'`);
    await asUser(me);
    const { rows } = await db.query('SELECT * FROM public.random_book_quote()');
    expect(rows).toEqual([]);
  });
});
