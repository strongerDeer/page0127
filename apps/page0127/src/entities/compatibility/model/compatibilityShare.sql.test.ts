import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 케미 결과 공유(20261124000800_compatibility_share.sql)를 실제 SQL 로 확인한다.
 * - 분석한 사람만 보고, shared_at 이 채워지면 상대도 본다
 * - 요청자를 모르는 옛 결과는 지금처럼 두 사람 모두 본다
 * - 상호 추천도 결과와 같은 규칙
 */
const db = new PGlite();
const ME = '11111111-1111-1111-1111-111111111111';
const YOU = '22222222-2222-2222-2222-222222222222';

const migration = readFileSync(
  new URL(
    '../../../../../../supabase/migrations/20261124000800_compatibility_share.sql',
    import.meta.url
  ),
  'utf8'
);

const as = async (uid: string, sql: string) => {
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${uid}',false);`
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec('RESET ROLE');
  }
};

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${ME}'), ('${YOU}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

    CREATE TABLE public.compatibility_analyses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id_1 uuid, user_id_2 uuid, compatibility_score int);
    ALTER TABLE public.compatibility_analyses ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view their own compatibility analyses" ON public.compatibility_analyses
      FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

    CREATE TABLE public.mutual_recommendations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      compatibility_analysis_id uuid);
    ALTER TABLE public.mutual_recommendations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view their mutual recommendations" ON public.mutual_recommendations
      FOR SELECT USING (EXISTS (SELECT 1 FROM public.compatibility_analyses ca
        WHERE ca.id = mutual_recommendations.compatibility_analysis_id
          AND (ca.user_id_1 = auth.uid() OR ca.user_id_2 = auth.uid())));

    CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text);
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('follow', 'comment', 'like', 'reading_reminder', 'weekly_recap', 'reading_nudge'));

    GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

    -- 마이그레이션 전에 쌓인 옛 결과
    INSERT INTO public.compatibility_analyses(id, user_id_1, user_id_2, compatibility_score)
      VALUES ('00000000-0000-0000-0000-000000000001', '${ME}', '${YOU}', 50);
  `);
  await db.exec(migration);
  await db.exec(`
    INSERT INTO public.compatibility_analyses(id, user_id_1, user_id_2, compatibility_score, requested_by)
      VALUES ('00000000-0000-0000-0000-000000000002', '${ME}', '${YOU}', 80, '${ME}');
    INSERT INTO public.mutual_recommendations(compatibility_analysis_id)
      VALUES ('00000000-0000-0000-0000-000000000002');
  `);
});

afterAll(async () => {
  await db.close();
});

const scores = async (uid: string) =>
  (
    await as(
      uid,
      'SELECT compatibility_score FROM public.compatibility_analyses ORDER BY compatibility_score'
    )
  ).rows.map((r) => (r as { compatibility_score: number }).compatibility_score);

const recs = async (uid: string) =>
  (await as(uid, 'SELECT id FROM public.mutual_recommendations')).rows.length;

describe('20261124000800 케미 결과 공유', () => {
  it('알리기 전: 분석한 사람만 새 결과와 추천을 본다, 옛 결과는 둘 다 본다', async () => {
    expect(await scores(ME)).toEqual([50, 80]);
    expect(await scores(YOU)).toEqual([50]);
    expect(await recs(ME)).toBe(1);
    expect(await recs(YOU)).toBe(0);
  });

  it('알린 뒤: 상대도 결과와 추천을 본다', async () => {
    await db.exec(
      `UPDATE public.compatibility_analyses SET shared_at = now() WHERE compatibility_score = 80`
    );
    expect(await scores(YOU)).toEqual([50, 80]);
    expect(await recs(YOU)).toBe(1);
  });

  it('분석한 사람은 두 사람 중 하나여야 하고, 알림 종류에 chemistry 가 있다', async () => {
    await expect(
      db.exec(
        `INSERT INTO auth.users VALUES ('33333333-3333-3333-3333-333333333333');
         INSERT INTO public.compatibility_analyses(user_id_1, user_id_2, compatibility_score, requested_by)
         VALUES ('${ME}', '${YOU}', 10, '33333333-3333-3333-3333-333333333333')`
      )
    ).rejects.toThrow(/requested_by_in_pair/);
    await db.exec(
      `INSERT INTO public.notifications(type) VALUES ('chemistry')`
    );
  });
});
