import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 연도별 목표 이력(20261124000500_reading_goals.sql)을 실제 SQL 로 확인한다.
 * profiles·auth 는 필요한 만큼만 흉내 낸다.
 */
const db = new PGlite();
const me = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';

const migration = readFileSync(
  new URL(
    '../../../../../../supabase/migrations/20261124000500_reading_goals.sql',
    import.meta.url
  ),
  'utf8'
);

const goals = async (uid: string) =>
  (
    await db.query<{ year: number; target: number }>(
      `SELECT year, target FROM public.reading_goals WHERE user_id = $1 ORDER BY year`,
      [uid]
    )
  ).rows;

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public TO authenticated, anon;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY, reading_goal jsonb DEFAULT '{}'::jsonb);
    -- 마이그레이션 전부터 있던 목표 — 첫 행으로 옮겨져야 한다
    INSERT INTO public.profiles VALUES
      ('${me}', '{"year": 2025, "target": 30}'),
      ('${other}', '{}');
  `);
  await db.exec(migration);
});

afterAll(async () => {
  await db.close();
});

describe('reading_goals', () => {
  it('지금 남아 있는 목표를 첫 행으로 옮긴다 — 빈 목표({})는 건너뛴다', async () => {
    expect(await goals(me)).toEqual([{ year: 2025, target: 30 }]);
    expect(await goals(other)).toEqual([]);
  });

  it('새 해 목표를 정해도 지난 해 목표가 남는다', async () => {
    await db.exec(
      `UPDATE public.profiles SET reading_goal = '{"year": 2026, "target": 24}' WHERE id = '${me}'`
    );
    expect(await goals(me)).toEqual([
      { year: 2025, target: 30 },
      { year: 2026, target: 24 },
    ]);
  });

  it('같은 해 목표를 고치면 그 해 행만 바뀐다', async () => {
    await db.exec(
      `UPDATE public.profiles SET reading_goal = '{"year": 2026, "target": 20}' WHERE id = '${me}'`
    );
    expect(await goals(me)).toEqual([
      { year: 2025, target: 30 },
      { year: 2026, target: 20 },
    ]);
  });

  it('이상한 목표 값은 옮기지 않지만 프로필 저장은 막지 않는다', async () => {
    await db.exec(
      `UPDATE public.profiles SET reading_goal = '{"year": "abc", "target": 5}' WHERE id = '${other}'`
    );
    expect(await goals(other)).toEqual([]);
  });

  it('방문자(anon)도 읽을 수 있고, 직접 쓰지는 못한다', async () => {
    await db.exec('SET ROLE anon;');
    expect(
      (await db.query(`SELECT 1 FROM public.reading_goals`)).rows.length
    ).toBeGreaterThan(0);
    await expect(
      db.exec(
        `INSERT INTO public.reading_goals(user_id, year, target) VALUES ('${other}', 2026, 3)`
      )
    ).rejects.toThrow();
    await db.exec('RESET ROLE;');
  });

  it('프로필이 지워지면 목표 이력도 함께 지워진다', async () => {
    await db.exec(`DELETE FROM public.profiles WHERE id = '${me}'`);
    expect(await goals(me)).toEqual([]);
  });
});
