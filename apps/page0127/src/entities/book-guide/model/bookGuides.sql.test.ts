import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 읽기 가이드 규칙(20261121000000_book_guides.sql)을 실제 SQL 로 확인한다.
 * global_books·공용 트리거 함수·Supabase 역할은 필요한 만큼만 흉내 낸다.
 */
const db = new PGlite();
const book1 = '30000000-0000-0000-0000-000000000001';
const book2 = '30000000-0000-0000-0000-000000000002';

const migration = readFileSync(
  new URL(
    '../../../../../../supabase/migrations/20261121000000_book_guides.sql',
    import.meta.url
  ),
  'utf8'
);

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    GRANT USAGE ON SCHEMA public TO authenticated, anon;
    CREATE TABLE public.global_books(id uuid PRIMARY KEY);
    INSERT INTO public.global_books VALUES ('${book1}'), ('${book2}');
    CREATE FUNCTION update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
  `);
  await db.exec(migration);
  // Supabase 는 public 테이블 권한을 기본으로 준다 — 실제로 막는 것은 RLS 다
  await db.exec(
    'GRANT ALL ON public.book_guides TO anon, authenticated;' +
      `INSERT INTO public.book_guides (global_book_id, status, sections)
       VALUES ('${book1}', 'published', '[{"type":"timeline"}]'),
              ('${book2}', 'draft', '[]');`
  );
});

afterAll(() => db.close());

describe('book_guides', () => {
  it('익명 방문자는 발행된 가이드만 읽는다', async () => {
    await db.exec('SET ROLE anon;');
    const { rows } = await db.query<{ global_book_id: string }>(
      'SELECT global_book_id FROM public.book_guides'
    );
    await db.exec('RESET ROLE;');

    expect(rows.map((r) => r.global_book_id)).toEqual([book1]);
  });

  it('익명 방문자는 가이드를 쓰지 못한다', async () => {
    await db.exec('SET ROLE anon;');
    await expect(
      db.exec(
        `UPDATE public.book_guides SET status = 'published' WHERE global_book_id = '${book2}'`
      )
    ).resolves.toBeDefined();
    await db.exec('RESET ROLE;');

    // 정책이 없어 0행이 바뀐다 — draft 그대로
    const { rows } = await db.query<{ status: string }>(
      `SELECT status FROM public.book_guides WHERE global_book_id = '${book2}'`
    );
    expect(rows[0].status).toBe('draft');
  });

  it('책 한 권에 가이드는 하나다', async () => {
    await expect(
      db.exec(
        `INSERT INTO public.book_guides (global_book_id) VALUES ('${book1}')`
      )
    ).rejects.toThrow();
  });

  it('sections 는 배열만 받는다', async () => {
    await expect(
      db.exec(
        `UPDATE public.book_guides SET sections = '{}' WHERE global_book_id = '${book2}'`
      )
    ).rejects.toThrow();
  });
});
