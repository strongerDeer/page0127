import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 대표 이미지·위치·글 종류(20261127004000_story_cover_and_kind.sql)를 실제 SQL 로 확인한다.
 * 운영에 이미 있는 글이 그대로(독후감·가운데) 남는지가 가장 중요하다.
 */
const db = new PGlite();
const BOOK = '2685df6a-7c49-4fb2-8bb0-2837665827ac';

const read = (file: string) =>
  readFileSync(
    new URL(`../../../../../../supabase/migrations/${file}`, import.meta.url),
    'utf8'
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
  await db.exec(read('20261127004000_story_cover_and_kind.sql'));
});

afterAll(async () => {
  await db.close();
});

const setPosition = (position: string) =>
  db.query(`UPDATE public.stories SET cover_position = $1`, [position]);

describe('stories — 대표 이미지·위치·글 종류', () => {
  it('이미 있던 글은 독후감·가운데·대표 이미지 없음', async () => {
    const { rows } = await db.query(
      `SELECT cover_image, cover_position, is_review FROM public.stories`
    );
    expect(rows).toEqual([
      { cover_image: null, cover_position: '50% 50%', is_review: true },
    ]);
  });

  it('위치는 "가로% 세로%" 정수만 받는다', async () => {
    await setPosition('0% 100%');
    await expect(setPosition('101% 0%')).rejects.toThrow();
    await expect(setPosition('left top')).rejects.toThrow();
    await expect(setPosition('50%; color: red')).rejects.toThrow();
  });

  it('대표 이미지는 객체만', async () => {
    await db.query(
      `UPDATE public.stories SET cover_image = '{"src":"/images/stories/a.webp","width":1,"height":1,"alt":""}'`
    );
    await expect(
      db.query(`UPDATE public.stories SET cover_image = '[]'`)
    ).rejects.toThrow();
  });
});
