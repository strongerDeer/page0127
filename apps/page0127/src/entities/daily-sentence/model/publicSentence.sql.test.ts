import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 비회원 오늘의 문장(20261124000300_public_daily_sentence.sql)을 실제 SQL 로 확인한다.
 * 회원 뽑기 규칙은 dailySentences.sql.test.ts 에 있다.
 */
const db = new PGlite();

const migration = (name: string) =>
  readFileSync(
    new URL(`../../../../../../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  );

const asAnon = () => db.exec('RESET ROLE; SET ROLE anon;');
const asAdmin = () => db.exec('RESET ROLE;');

const drawPublic = (key: string) =>
  db.query<{ sentence_id: string; text: string; draw_date: string }>(
    'SELECT sentence_id, text, draw_date::text FROM public.draw_public_sentence($1)',
    [key]
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
  await db.exec(migration('20261109000300_daily_sentence_cover.sql'));
  await db.exec(migration('20261124000300_public_daily_sentence.sql'));
  // Supabase 는 public 테이블 권한을 기본으로 준다 — 실제로 막는 것은 RLS 다
  await db.exec(`
    GRANT SELECT ON public.daily_sentences TO anon, authenticated;
  `);
  // 문장 10개 + 꺼 둔 문장 1개
  const values = Array.from(
    { length: 10 },
    (_, i) =>
      `('20000000-0000-0000-0000-0000000000${String(i + 10)}','문장 ${i}','책 ${i}', true)`
  ).join(',');
  await db.exec(`
    INSERT INTO public.daily_sentences(id,text,book_title,is_active) VALUES ${values},
      ('20000000-0000-0000-0000-000000000099','꺼 둔 문장','책 끔', false);
  `);
});
afterAll(() => db.close());

describe('draw_public_sentence (비회원)', () => {
  it('로그인 없이(anon) 한 문장을 받는다', async () => {
    await asAnon();
    const { rows } = await drawPublic('browser_key_aaaa');
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toMatch(/^문장 \d$/);
  });

  it('같은 열쇠면 몇 번을 불러도 같은 문장 — 새로고침으로 바뀌지 않는다', async () => {
    await asAnon();
    const first = (await drawPublic('browser_key_bbbb')).rows[0].sentence_id;
    for (let i = 0; i < 5; i += 1) {
      expect((await drawPublic('browser_key_bbbb')).rows[0].sentence_id).toBe(
        first
      );
    }
  });

  it('열쇠가 다르면 문장이 갈린다(사람마다 다른 문장)', async () => {
    await asAnon();
    const picked = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      picked.add(
        (await drawPublic(`browser_key_${String(i).padStart(4, '0')}`)).rows[0]
          .sentence_id
      );
    }
    // 30개 열쇠가 10개 문장 중 한두 개에 몰리지 않는다
    expect(picked.size).toBeGreaterThanOrEqual(5);
  });

  it('꺼 둔 문장은 나오지 않는다', async () => {
    await asAnon();
    for (let i = 0; i < 30; i += 1) {
      const { rows } = await drawPublic(
        `off_check_${String(i).padStart(4, '0')}`
      );
      expect(rows[0].text).not.toBe('꺼 둔 문장');
    }
  });

  it('이상한 열쇠는 거절한다', async () => {
    await asAnon();
    await expect(drawPublic('짧')).rejects.toThrow();
    await expect(drawPublic("x'; DROP TABLE x; --")).rejects.toThrow();
  });

  it('기록을 남기지 않는다', async () => {
    await asAnon();
    await drawPublic('browser_key_cccc');
    await asAdmin();
    const { rows } = await db.query('SELECT 1 FROM public.sentence_draws');
    expect(rows).toHaveLength(0);
  });

  it('비회원은 문장 표를 직접 읽지 못한다(RLS)', async () => {
    await asAnon();
    const { rows } = await db.query('SELECT 1 FROM public.daily_sentences');
    expect(rows).toHaveLength(0);
  });
});
