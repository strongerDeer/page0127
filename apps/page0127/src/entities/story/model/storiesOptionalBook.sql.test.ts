import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 책 없는 글 허용(20261124000600_stories_optional_book.sql)을 실제 SQL 로 확인한다.
 * stories 를 만든 원래 마이그레이션(20261123000000)부터 차례로 돌린다 — 운영에 이미 있는
 * 책 있는 글(대온실)이 새 CHECK 를 통과하는지가 가장 중요하다.
 * global_books·storage 는 필요한 만큼만 흉내 낸다.
 */
const db = new PGlite();
const BOOK = '2685df6a-7c49-4fb2-8bb0-2837665827ac';

const read = (file: string) =>
  readFileSync(
    new URL(`../../../../../../supabase/migrations/${file}`, import.meta.url),
    'utf8'
  );

const insert = (values: string) =>
  db.exec(
    `INSERT INTO public.stories (slug, book_id, book_title, book_author, title, rating) VALUES ${values}`
  );

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE TABLE public.global_books(id uuid PRIMARY KEY);
    INSERT INTO public.global_books VALUES ('${BOOK}');
    CREATE FUNCTION update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid, bucket_id text);
  `);
  await db.exec(read('20261123000000_stories.sql'));
  await db.exec(read('20261124000600_stories_optional_book.sql'));
});

afterAll(async () => {
  await db.close();
});

describe('stories — 책 없는 글', () => {
  it('이미 있던 책 있는 글(대온실 초안)은 그대로 남는다', async () => {
    const { rows } = await db.query<{ slug: string; book_id: string }>(
      `SELECT slug, book_id FROM public.stories`
    );
    expect(rows).toEqual([{ slug: 'daeonsil-repair-report', book_id: BOOK }]);
  });

  it('책 없이 제목·저자 빈칸·별점 0 이면 저장된다', async () => {
    await insert(`('korea-reading-stats', NULL, '', '', '한국 독서 통계', 0)`);
    const { rows } = await db.query<{ book_title: string }>(
      `SELECT book_title FROM public.stories WHERE slug = 'korea-reading-stats'`
    );
    expect(rows).toEqual([{ book_title: '' }]);
  });

  it('책 없는데 책 제목이나 별점이 있으면 막는다', async () => {
    await expect(
      insert(`('no-book-title', NULL, '어떤 책', '', '제목', 0)`)
    ).rejects.toThrow(/stories_book_fields_match/);
    await expect(
      insert(`('no-book-rating', NULL, '', '', '제목', 4)`)
    ).rejects.toThrow(/stories_book_fields_match/);
  });

  it('첫 숫자(lead_stat)는 객체만 받는다', async () => {
    await db.exec(
      `UPDATE public.stories SET lead_stat = '{"value": 38.5, "unit": "%"}' WHERE slug = 'korea-reading-stats'`
    );
    await expect(
      db.exec(
        `UPDATE public.stories SET lead_stat = '[1]' WHERE slug = 'korea-reading-stats'`
      )
    ).rejects.toThrow();
  });
});
