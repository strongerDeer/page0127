import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * 오늘의 문장 규칙(20261109000200_daily_sentences.sql)을 실제 SQL 로 확인한다.
 * Supabase 의 auth 스키마·authenticated 역할은 필요한 만큼만 흉내 낸다.
 */
const db = new PGlite();
const me = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const s1 = '20000000-0000-0000-0000-000000000001';
const s2 = '20000000-0000-0000-0000-000000000002';

const migration = (name: string) =>
  readFileSync(
    new URL(`../../../../../../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  );

const asUser = (uid: string) =>
  db.exec(
    `RESET ROLE; SELECT set_config('test.uid','${uid}',false); SET ROLE authenticated;`
  );
const asAdmin = () => db.exec('RESET ROLE;');

/** KST 오늘 — 함수와 같은 식으로 DB 에 묻는다 */
const kstToday = async () =>
  (
    await db.query<{ d: string }>(
      `SELECT ((now() AT TIME ZONE 'Asia/Seoul')::date)::text AS d`
    )
  ).rows[0].d;

const draw = () =>
  db.query<{ sentence_id: string; text: string; draw_date: string }>(
    'SELECT sentence_id, text, draw_date::text FROM public.draw_daily_sentence()'
  );

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
  `);
  await db.exec(migration('20261109000200_daily_sentences.sql'));
  // Supabase 는 public 테이블 권한을 기본으로 준다 — 실제로 막는 것은 RLS 다
  await db.exec(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_sentences, public.sentence_draws TO authenticated;
  `);
});
afterAll(() => db.close());
beforeEach(async () => {
  await asAdmin();
  await db.exec(`
    DELETE FROM public.sentence_draws; DELETE FROM public.daily_sentences; DELETE FROM auth.users;
    INSERT INTO auth.users VALUES ('${me}'),('${other}');
    INSERT INTO public.daily_sentences(id,text,book_title) VALUES
      ('${s1}','첫 문장','책 하나'),
      ('${s2}','둘째 문장','책 둘');
  `);
});

describe('draw_daily_sentence', () => {
  it('오늘(KST) 날짜로 하나를 뽑아 기록한다', async () => {
    await asUser(me);
    const { rows } = await draw();
    expect(rows).toHaveLength(1);
    expect(rows[0].draw_date).toBe(await kstToday());
    expect([s1, s2]).toContain(rows[0].sentence_id);
  });

  it('같은 날 다시 불러도 같은 문장 — 다시 뽑지 않는다', async () => {
    await asUser(me);
    const first = (await draw()).rows[0];
    for (let i = 0; i < 5; i += 1) {
      expect((await draw()).rows[0].sentence_id).toBe(first.sentence_id);
    }
    const { rows } = await db.query('SELECT 1 FROM public.sentence_draws');
    expect(rows).toHaveLength(1);
  });

  it('아직 안 본 문장을 먼저 고른다', async () => {
    await asAdmin();
    await db.exec(
      `INSERT INTO public.sentence_draws VALUES ('${me}','2026-01-01','${s1}')`
    );
    await asUser(me);
    for (let i = 0; i < 3; i += 1) {
      await asAdmin();
      await db.exec(
        `DELETE FROM public.sentence_draws WHERE draw_date <> '2026-01-01'`
      );
      await asUser(me);
      expect((await draw()).rows[0].sentence_id).toBe(s2);
    }
  });

  it('비활성 문장은 뽑히지 않고, 활성 문장이 없으면 아무것도 돌려주지 않는다', async () => {
    await asAdmin();
    await db.exec(`UPDATE public.daily_sentences SET is_active = false`);
    await asUser(me);
    expect((await draw()).rows).toEqual([]);
    expect(
      (
        await db.query<{ b: boolean }>(
          'SELECT public.has_daily_sentences() AS b'
        )
      ).rows[0].b
    ).toBe(false);
  });

  it('로그인하지 않으면 실패한다', async () => {
    await asUser('');
    await expect(draw()).rejects.toThrow();
  });
});

describe('RLS — 나만 보기', () => {
  it('풀 전체는 못 읽고, 내가 뽑은 문장만 읽힌다', async () => {
    await asUser(me);
    expect(
      (await db.query('SELECT 1 FROM public.daily_sentences')).rows
    ).toHaveLength(0);
    const picked = (await draw()).rows[0].sentence_id;
    const { rows } = await db.query<{ id: string }>(
      'SELECT id FROM public.daily_sentences'
    );
    expect(rows.map((row) => row.id)).toEqual([picked]);
  });

  it('남의 뽑기 기록은 보이지 않는다', async () => {
    await asUser(other);
    await draw();
    await asUser(me);
    expect(
      (await db.query('SELECT 1 FROM public.sentence_draws')).rows
    ).toHaveLength(0);
  });

  it('직접 기록을 끼워 넣을 수 없다 — 함수로만 생긴다', async () => {
    await asUser(me);
    await expect(
      db.exec(
        `INSERT INTO public.sentence_draws VALUES ('${me}','2026-01-02','${s1}')`
      )
    ).rejects.toThrow();
  });

  it('뽑힌 문장은 지울 수 없다(캘린더 기록 보호)', async () => {
    await asUser(me);
    const picked = (await draw()).rows[0].sentence_id;
    await asAdmin();
    await expect(
      db.exec(`DELETE FROM public.daily_sentences WHERE id = '${picked}'`)
    ).rejects.toThrow();
  });
});
