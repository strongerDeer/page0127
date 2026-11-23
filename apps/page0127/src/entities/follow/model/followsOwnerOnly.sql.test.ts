import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * follows RLS — "누가 누구를" 명단은 내가 낀 행만 보인다 (20261123000100).
 * 숫자는 user_follow_stats 뷰가 따로 내보내므로 여기서는 명단만 확인한다.
 */
const db = new PGlite();
const me = '00000000-0000-0000-0000-000000000001';
const friend = '00000000-0000-0000-0000-000000000002';
const stranger = '00000000-0000-0000-0000-000000000003';
const other = '00000000-0000-0000-0000-000000000004';

const migration = (name: string) =>
  readFileSync(
    fileURLToPath(
      new URL(`../../../../../../supabase/migrations/${name}`, import.meta.url)
    ),
    'utf8'
  );

const visibleRows = async (as: 'anon' | 'authenticated', uid: string) => {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await db.exec(`SET ROLE ${as}`);
  const { rows } = await db.query<{
    follower_id: string;
    following_id: string;
  }>('SELECT follower_id, following_id FROM public.follows ORDER BY 1, 2');
  await db.exec('RESET ROLE');
  return rows;
};

beforeAll(async () => {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE public.follows(follower_id uuid, following_id uuid);
    GRANT SELECT ON public.follows TO authenticated, anon;
    ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
    -- 이전 정책: 누구나 전체 조회
    CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
  `);
  await db.exec(migration('20261123000100_follows_owner_only.sql'));
}, 30_000);

beforeEach(async () => {
  await db.exec('RESET ROLE; TRUNCATE public.follows');
  await db.query(
    'INSERT INTO public.follows VALUES ($1,$2), ($2,$1), ($3,$4)',
    [me, friend, stranger, other]
  );
});

afterAll(async () => {
  await db.close();
});

describe('follows RLS: 명단은 본인만', () => {
  it('로그인한 나는 내가 낀 행(팔로잉·팔로워)만 본다', async () => {
    expect(await visibleRows('authenticated', me)).toEqual([
      { follower_id: me, following_id: friend },
      { follower_id: friend, following_id: me },
    ]);
  });

  it('남끼리의 팔로우(stranger → other)는 보이지 않는다', async () => {
    const rows = await visibleRows('authenticated', me);
    expect(rows.some((r) => r.follower_id === stranger)).toBe(false);
  });

  it('비로그인(anon 키)은 아무 행도 못 본다', async () => {
    expect(await visibleRows('anon', '')).toEqual([]);
  });
});
