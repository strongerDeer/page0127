import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 결과·알림은 서버만 쓴다(20261124000700_server_only_results_and_cover_limits.sql)를 실제 SQL 로 확인한다.
 *
 * 원래 정책(사용자 INSERT 허용)을 그대로 만든 뒤 마이그레이션을 돌려,
 * - 로그인 사용자(authenticated)의 직접 INSERT 는 막히고
 * - 읽기·읽음 표시 같은 나머지 정책은 그대로 남는지 본다.
 * storage.buckets 는 필요한 만큼만 흉내 낸다.
 */
const db = new PGlite();
const ME = '11111111-1111-1111-1111-111111111111';
const YOU = '22222222-2222-2222-2222-222222222222';

const migration = readFileSync(
  new URL(
    '../../../../../../supabase/migrations/20261124000700_server_only_results_and_cover_limits.sql',
    import.meta.url
  ),
  'utf8'
);

const asMe = async (sql: string) => {
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${ME}',false);`
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec('RESET ROLE');
  }
};

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

    CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid, actor_id uuid, type text, message text, is_read boolean DEFAULT false);
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can create notifications as themselves" ON public.notifications
      FOR INSERT WITH CHECK (auth.uid() = actor_id AND user_id <> actor_id
        AND type IN ('follow','comment','like') AND message IS NULL);
    CREATE POLICY "Users can view their own notifications" ON public.notifications
      FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can update their own notifications" ON public.notifications
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE TABLE public.compatibility_analyses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id_1 uuid, user_id_2 uuid, compatibility_score int);
    ALTER TABLE public.compatibility_analyses ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can insert compatibility analyses involving them" ON public.compatibility_analyses
      FOR INSERT WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
    CREATE POLICY "Users can view their own compatibility analyses" ON public.compatibility_analyses
      FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

    CREATE TABLE public.mutual_recommendations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      compatibility_analysis_id uuid);
    ALTER TABLE public.mutual_recommendations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can insert recommendations for their compatibility" ON public.mutual_recommendations
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.compatibility_analyses ca
        WHERE ca.id = mutual_recommendations.compatibility_analysis_id
          AND (ca.user_id_1 = auth.uid() OR ca.user_id_2 = auth.uid())));

    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY, file_size_limit bigint, allowed_mime_types text[]);
    INSERT INTO storage.buckets(id) VALUES ('book-covers'), ('profiles');
  `);
  await db.exec(migration);
});

afterAll(async () => {
  await db.close();
});

describe('20261124000700 결과·알림은 서버만 쓴다', () => {
  it('로그인 사용자가 남에게 가짜 알림을 직접 넣을 수 없다', async () => {
    await expect(
      asMe(
        `INSERT INTO public.notifications(user_id, actor_id, type) VALUES ('${YOU}','${ME}','follow')`
      )
    ).rejects.toThrow(/row-level security/);
  });

  it('서버(정책을 우회하는 역할)는 알림을 넣을 수 있고, 받은 사람은 읽음 표시를 할 수 있다', async () => {
    await db.exec(
      `INSERT INTO public.notifications(user_id, actor_id, type) VALUES ('${ME}','${YOU}','like')`
    );
    const updated = await asMe(
      'UPDATE public.notifications SET is_read = true RETURNING id'
    );
    expect(updated.rows).toHaveLength(1);
  });

  it('케미 결과·상호 추천을 직접 써 넣을 수 없다', async () => {
    await expect(
      asMe(
        `INSERT INTO public.compatibility_analyses(user_id_1, user_id_2, compatibility_score) VALUES ('${ME}','${YOU}',100)`
      )
    ).rejects.toThrow(/row-level security/);

    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO public.compatibility_analyses(user_id_1, user_id_2, compatibility_score) VALUES ('${ME}','${YOU}',70) RETURNING id`
    );
    await expect(
      asMe(
        `INSERT INTO public.mutual_recommendations(compatibility_analysis_id) VALUES ('${rows[0].id}')`
      )
    ).rejects.toThrow(/row-level security/);

    // 읽기는 그대로 — 두 사람 다 서버가 저장한 결과를 본다
    const seen = await asMe(
      'SELECT compatibility_score FROM public.compatibility_analyses'
    );
    expect(seen.rows).toEqual([{ compatibility_score: 70 }]);
  });

  it('책 표지 버킷에만 5MB·이미지 형식 제한을 건다', async () => {
    const { rows } = await db.query(
      'SELECT id, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id'
    );
    expect(rows).toEqual([
      {
        id: 'book-covers',
        file_size_limit: 5242880,
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
      },
      { id: 'profiles', file_size_limit: null, allowed_mime_types: null },
    ]);
  });
});
