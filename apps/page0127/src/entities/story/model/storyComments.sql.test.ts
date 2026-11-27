import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 책 이야기 댓글·좋아요(20261127003000_story_comments_likes.sql)를 실제 SQL 로 확인한다.
 * auth·book_comments·reports·체험 차단 함수는 필요한 만큼만 흉내 낸다.
 * RLS 는 authenticated 역할 + request.jwt.claim.sub 로 auth.uid() 를 흉내 내서 본다.
 */
const db = new PGlite();
const BOOK = '2685df6a-7c49-4fb2-8bb0-2837665827ac';
const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
let published = '';
let draft = '';

const read = (file: string) =>
  readFileSync(
    new URL(`../../../../../../supabase/migrations/${file}`, import.meta.url),
    'utf8'
  );

/** 로그인한 사용자(authenticated)로 한 문장 실행 */
const asUser = async (uid: string, sql: string, params: unknown[] = []) => {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('RESET ROLE;');
  }
};

const insertComment = (story: string, user: string, parent: string | null = null) =>
  db.query<{ id: string }>(
    `INSERT INTO public.story_comments (story_id, user_id, parent_comment_id, content)
     VALUES ($1, $2, $3, '좋은 글') RETURNING id`,
    [story, user, parent]
  );

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    INSERT INTO auth.users VALUES ('${ME}'), ('${OTHER}');
    CREATE TABLE public.global_books(id uuid PRIMARY KEY);
    INSERT INTO public.global_books VALUES ('${BOOK}');
    CREATE FUNCTION update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
    CREATE FUNCTION public.block_demo_writes() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RETURN NULL; END $$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid, bucket_id text);
    -- 20260806000000 의 reports 모양 그대로(대상은 book_comments 하나)
    CREATE TABLE public.book_comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
    CREATE TABLE public.reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id uuid,
      comment_id uuid REFERENCES public.book_comments(id) ON DELETE CASCADE,
      reason text NOT NULL,
      CONSTRAINT reports_one_target CHECK (num_nonnulls(comment_id) = 1)
    );
    ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can read own reports" ON public.reports
      FOR SELECT USING (auth.uid() = reporter_id);
    GRANT SELECT, INSERT ON public.reports TO authenticated;
    GRANT SELECT ON public.book_comments TO authenticated;
  `);
  await db.exec(read('20261123000000_stories.sql'));
  await db.exec(read('20261124000600_stories_optional_book.sql'));
  // Supabase 는 public 표에 기본 권한을 준다(행은 RLS 가 거른다) — 그 기본값을 흉내 낸다
  await db.exec('GRANT SELECT ON public.stories TO anon, authenticated;');
  await db.exec(read('20261127003000_story_comments_likes.sql'));

  const { rows } = await db.query<{ id: string; slug: string }>(`
    INSERT INTO public.stories (slug, title, is_published, published_at)
    VALUES ('open-story', '공개 글', true, now()), ('draft-story', '초안', false, null)
    RETURNING id, slug`);
  published = rows.find((r) => r.slug === 'open-story')!.id;
  draft = rows.find((r) => r.slug === 'draft-story')!.id;
});

afterAll(async () => {
  await db.close();
});

describe('story_comments 규칙', () => {
  it('답글의 답글은 막는다(1단계까지)', async () => {
    const { rows: [root] } = await insertComment(published, ME);
    const { rows: [reply] } = await insertComment(published, OTHER, root.id);
    await expect(insertComment(published, ME, reply.id)).rejects.toThrow('1depth');
  });

  it('다른 글의 댓글에는 답글을 달 수 없다', async () => {
    const { rows: [root] } = await insertComment(published, ME);
    await expect(insertComment(draft, ME, root.id)).rejects.toThrow('다른 대상');
  });

  it('빈 댓글·2000자 넘는 댓글은 막는다', async () => {
    await expect(
      db.query(`INSERT INTO public.story_comments (story_id, user_id, content) VALUES ($1, $2, '   ')`, [published, ME])
    ).rejects.toThrow();
    await expect(
      db.query(`INSERT INTO public.story_comments (story_id, user_id, content) VALUES ($1, $2, $3)`, [published, ME, 'a'.repeat(2001)])
    ).rejects.toThrow();
  });
});

describe('story_comments RLS', () => {
  it('공개 글에는 내 이름으로 쓸 수 있다', async () => {
    const { rows } = await asUser(
      ME,
      `INSERT INTO public.story_comments (story_id, user_id, content) VALUES ($1, $2, '반가워요') RETURNING id`,
      [published, ME]
    );
    expect(rows).toHaveLength(1);
  });

  it('남의 이름으로는 못 쓴다', async () => {
    await expect(
      asUser(ME, `INSERT INTO public.story_comments (story_id, user_id, content) VALUES ($1, $2, '사칭')`, [published, OTHER])
    ).rejects.toThrow(/row-level security/);
  });

  it('공개 안 된 글에는 못 쓴다', async () => {
    await expect(
      asUser(ME, `INSERT INTO public.story_comments (story_id, user_id, content) VALUES ($1, $2, '초안')`, [draft, ME])
    ).rejects.toThrow(/row-level security/);
  });

  it('가려진 댓글은 아무에게도 안 보인다', async () => {
    const { rows: [c] } = await insertComment(published, OTHER);
    await db.query(`UPDATE public.story_comments SET is_hidden = true WHERE id = $1`, [c.id]);
    const { rows } = await asUser(ME, `SELECT id FROM public.story_comments WHERE id = $1`, [c.id]);
    expect(rows).toHaveLength(0);
  });
});

describe('story_likes', () => {
  it('공개 글에 한 번만 누를 수 있다', async () => {
    await asUser(ME, `INSERT INTO public.story_likes (user_id, story_id) VALUES ($1, $2)`, [ME, published]);
    await expect(
      asUser(ME, `INSERT INTO public.story_likes (user_id, story_id) VALUES ($1, $2)`, [ME, published])
    ).rejects.toThrow();
  });

  it('공개 안 된 글에는 못 누른다', async () => {
    await expect(
      asUser(ME, `INSERT INTO public.story_likes (user_id, story_id) VALUES ($1, $2)`, [ME, draft])
    ).rejects.toThrow(/row-level security/);
  });
});

describe('reports — 책 이야기 댓글 신고', () => {
  it('남의 책 이야기 댓글을 신고할 수 있다', async () => {
    const { rows: [c] } = await insertComment(published, OTHER);
    const { rows } = await asUser(
      ME,
      `INSERT INTO public.reports (reporter_id, story_comment_id, reason) VALUES ($1, $2, 'spam') RETURNING id`,
      [ME, c.id]
    );
    expect(rows).toHaveLength(1);
  });

  it('내 댓글은 신고할 수 없다', async () => {
    const { rows: [c] } = await insertComment(published, ME);
    await expect(
      asUser(ME, `INSERT INTO public.reports (reporter_id, story_comment_id, reason) VALUES ($1, $2, 'spam')`, [ME, c.id])
    ).rejects.toThrow(/row-level security/);
  });

  it('대상은 정확히 하나 — 둘 다 비거나 둘 다 차면 막는다', async () => {
    await expect(
      db.query(`INSERT INTO public.reports (reporter_id, reason) VALUES ($1, 'spam')`, [ME])
    ).rejects.toThrow(/reports_one_target/);
  });
});
