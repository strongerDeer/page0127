import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * 직접 등록 표지 규칙(20261101000100_manual_book_cover_upload.sql)을 실제 SQL 로 확인한다.
 *
 * Supabase 의 auth·storage 스키마는 필요한 만큼만 흉내 낸다. 앞선 검수 마이그레이션
 * (20261028000000)을 먼저 적용해 운영과 같은 순서로 함수를 덮어쓴다.
 */
const db = new PGlite();
const me = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const file = '30000000-0000-0000-0000-000000000001.webp';
const host = 'https://abcdefghijklmnop.supabase.co';
const coverUrl = (uid: string, name = file, origin = host) =>
  `${origin}/storage/v1/object/public/book-covers/manual/${uid}/${name}`;

const migration = (name: string) =>
  readFileSync(
    new URL(`../../../../../../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  );

const asUser = (uid: string) =>
  db.exec(
    `SELECT set_config('test.uid','${uid}',false), set_config('test.role','authenticated',false);`
  );

/** 내가 기록을 하나 만들고, 카탈로그·내 기록에 남은 표지를 돌려준다 */
const addManualBook = async (isbn: string, cover: string | null) => {
  await db.query(
    `INSERT INTO public.books(user_id,isbn,title,author,cover_image,source,is_public)
     VALUES ($1,$2,'직접 등록 책','저자',$3,'manual',true)`,
    [me, isbn, cover]
  );
  const catalog = await db.query<{ cover_image: string | null }>(
    'SELECT cover_image FROM public.global_books WHERE isbn = $1',
    [isbn]
  );
  const reading = await db.query<{ cover_image: string | null }>(
    'SELECT cover_image FROM public.books WHERE isbn = $1',
    [isbn]
  );
  return {
    catalog: catalog.rows[0]?.cover_image ?? null,
    reading: reading.rows[0]?.cover_image ?? null,
  };
};

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.role', true), '') $$;

    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
      SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    CREATE FUNCTION storage.filename(name text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
      SELECT (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "test read" ON storage.objects FOR SELECT USING (true);
    GRANT USAGE ON SCHEMA storage, auth, public TO authenticated, anon;
    GRANT SELECT, INSERT ON storage.objects TO authenticated;

    CREATE TABLE public.global_books(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), isbn text UNIQUE NOT NULL,
      title text NOT NULL, author text, publisher text, sub_title text, description text,
      pub_date date, category text, cover_image text, spine_image text, back_image text,
      provider_item_id text, source text NOT NULL DEFAULT 'yes24', created_at timestamptz DEFAULT now());
    CREATE TABLE public.books(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, isbn text, title text,
      author text, publisher text, sub_title text, description text, pub_date date,
      category text, cover_image text, spine_image text, provider_item_id text,
      source text, is_public boolean DEFAULT true, created_at timestamptz DEFAULT now());
    CREATE TABLE public.activities(id uuid PRIMARY KEY, user_id uuid, book_id uuid);
  `);
  await db.exec(migration('20261028000000_book_catalog_review.sql'));
  await db.exec(migration('20261101000100_manual_book_cover_upload.sql'));
});
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(`
    SELECT set_config('test.role','service_role',false);
    DELETE FROM public.books; DELETE FROM public.global_books; DELETE FROM storage.objects; DELETE FROM auth.users;
    INSERT INTO auth.users VALUES ('${me}'),('${other}');
    INSERT INTO storage.objects(bucket_id,name) VALUES
      ('book-covers','manual/${me}/${file}'),
      ('book-covers','manual/${other}/${file}');
  `);
  await asUser(me);
});

describe('직접 등록 표지', () => {
  it('내 폴더에 실제로 올린 표지는 카탈로그와 내 기록에 남는다', async () => {
    const url = coverUrl(me);
    expect(await addManualBook('manual:a', url)).toEqual({
      catalog: url,
      reading: url,
    });
  });

  it('로컬 Supabase 주소도 받는다', async () => {
    const url = coverUrl(me, file, 'http://127.0.0.1:54321');
    await db.exec(
      `INSERT INTO storage.objects(bucket_id,name) VALUES ('book-covers','manual/${me}/${file}')`
    );
    expect((await addManualBook('manual:local', url)).catalog).toBe(url);
  });

  it('다른 사람 폴더·없는 파일·외부 호스트·백필 경로는 지운다', async () => {
    const rejected = [
      coverUrl(other),
      coverUrl(me, '30000000-0000-0000-0000-000000000009.webp'),
      coverUrl(me, file, 'https://evil.example.com'),
      `${host}/storage/v1/object/public/book-covers/9788937460449/cover.jpg`,
      'https://image.yes24.com/goods/1/XL',
    ];
    for (const [i, url] of rejected.entries()) {
      expect(await addManualBook(`manual:x${i}`, url)).toEqual({
        catalog: null,
        reading: null,
      });
    }
  });

  it('보완 요청으로 다시 낼 때 표지는 그대로 남는다', async () => {
    const url = coverUrl(me);
    await addManualBook('manual:b', url);
    await db.exec(
      `UPDATE public.global_books SET title = '고친 제목', review_status = 'pending' WHERE isbn = 'manual:b'`
    );
    const { rows } = await db.query<{ cover_image: string | null }>(
      `SELECT cover_image FROM public.global_books WHERE isbn = 'manual:b'`
    );
    expect(rows[0].cover_image).toBe(url);
  });
});

describe('표지 업로드 정책', () => {
  const upload = async (uid: string, name: string) => {
    await db.exec(`SET ROLE authenticated`);
    try {
      await db.query(
        `INSERT INTO storage.objects(bucket_id,name) VALUES ('book-covers',$1)`,
        [name]
      );
      return true;
    } catch {
      return false;
    } finally {
      await db.exec(`RESET ROLE`);
    }
  };

  it('내 manual 폴더에 uuid 이름으로만 올릴 수 있다', async () => {
    expect(
      await upload(me, `manual/${me}/30000000-0000-0000-0000-000000000002.webp`)
    ).toBe(true);
    expect(
      await upload(
        me,
        `manual/${other}/30000000-0000-0000-0000-000000000003.webp`
      )
    ).toBe(false);
    expect(await upload(me, '9788937460449/cover.jpg')).toBe(false);
    expect(await upload(me, `manual/${me}/cover.gif`)).toBe(false);
  });
});
