import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getCurrentLibraryYear } from '@/entities/book/model/libraryPeriod';

const db = new PGlite();
const me = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const stranger = '00000000-0000-0000-0000-000000000003';
const year = getCurrentLibraryYear();
type Social = {
  year: number;
  genres: { user_id: string; categories: string[] }[];
  clashes: {
    title: string;
    mine_rating: number;
    other_rating: number;
    rating_gap: number;
    other_user_id: string;
  }[];
};
const social = async () =>
  (
    await db.query<{ result: Social }>(
      'SELECT public.get_following_reading_social() AS result'
    )
  ).rows[0].result;
const addBook = async (overrides: Record<string, unknown> = {}) => {
  const b = {
    id: crypto.randomUUID(),
    user_id: me,
    isbn: crypto.randomUUID(),
    category: '국내도서>소설',
    rating: 5,
    is_public: true,
    status: 'completed',
    completed_date: `${year}-01-01`,
    completed_year: null,
    created_at: `${year}-01-01T00:00:00Z`,
    ...overrides,
  };
  await db.query(
    `INSERT INTO books(id,user_id,isbn,category,rating,is_public,status,completed_date,completed_year,created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    Object.values(b)
  );
  return b.id;
};
const send = (
  recipient = other,
  message = 'together',
  bookId: string | null = null
) =>
  db.query('SELECT public.send_reading_nudge($1,$2,$3)', [
    recipient,
    message,
    bookId,
  ]);

beforeAll(async () => {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,anon;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE follows(follower_id uuid,following_id uuid);
    CREATE TABLE books(id uuid PRIMARY KEY,user_id uuid,isbn text,category text,rating int,is_public boolean,status text,
      completed_date date,completed_year int,created_at timestamptz,read_count int DEFAULT 1,title text DEFAULT '공통 책',author text,cover_image text,provider_item_id text);
    CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,actor_id uuid,type text,message text,target_id uuid,target_type text);
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    GRANT INSERT,SELECT,DELETE ON notifications TO authenticated;
    CREATE POLICY "Users can create notifications as themselves" ON notifications FOR INSERT
      WITH CHECK(auth.uid()=actor_id AND user_id<>actor_id AND type IN ('follow','comment','like') AND message IS NULL);
    CREATE POLICY own_notifications ON notifications FOR SELECT USING(auth.uid()=user_id);
  `);
  await db.exec(
    readFileSync(
      fileURLToPath(
        new URL(
          '../../../../../../supabase/migrations/20261025000003_lounge_social_battles.sql',
          import.meta.url
        )
      ),
      'utf8'
    )
  );
}, 30_000);
beforeEach(async () => {
  await db.exec(
    'RESET ROLE; TRUNCATE auth.users,books,follows,notifications,reading_nudge_settings,reading_nudge_limits CASCADE'
  );
  for (const id of [me, other, stranger])
    await db.query('INSERT INTO auth.users VALUES($1)', [id]);
  await db.query('INSERT INTO follows VALUES($1,$2)', [me, other]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [me]);
});
afterAll(async () => {
  await db.close();
});

describe('라운지 소셜 RPC', () => {
  it('장르는 올해 공개 완독과 연도만 있는 기록을 포함하고 회독 대표를 고른다', async () => {
    await addBook({ isbn: 'A', category: '이전 분류' });
    await addBook({
      isbn: 'A',
      category: '새 분류',
      completed_date: `${year}-06-01`,
    });
    await addBook({
      category: '과학',
      completed_date: null,
      completed_year: year,
    });
    await addBook({ category: '비공개', is_public: false });
    await addBook({ category: '지난해', completed_date: `${year - 1}-01-01` });
    await addBook({ category: '읽는 중', status: 'reading' });
    await addBook({ category: '팔로우 아님', user_id: stranger });
    const data = await social();
    expect(
      data.genres.find((r) => r.user_id === me)?.categories.sort()
    ).toEqual(['과학', '새 분류']);
    expect(data.genres.find((r) => r.user_id === other)?.categories).toEqual(
      []
    );
    expect(JSON.stringify(data)).not.toMatch(/비공개|지난해|팔로우 아님/);
  });
  it('취향은 과거 공통 책도 비교하되 최신 공개 회독·별점 1~5만 사용한다', async () => {
    await addBook({
      isbn: 'A',
      completed_date: `${year - 2}-01-01`,
      rating: 5,
    });
    await addBook({ isbn: 'A', user_id: other, rating: 4 });
    await addBook({
      isbn: 'A',
      user_id: other,
      rating: 2,
      completed_date: `${year}-06-01`,
    });
    await addBook({ isbn: 'A', user_id: stranger, rating: 1 });
    await addBook({ isbn: 'B', rating: 5 });
    await addBook({ isbn: 'B', user_id: other, rating: 0 });
    await addBook({ isbn: 'C', rating: 5, is_public: false });
    await addBook({ isbn: 'C', user_id: other, rating: 1 });
    const data = await social();
    expect(data.clashes).toHaveLength(1);
    expect(data.clashes[0]).toMatchObject({
      mine_rating: 5,
      other_rating: 2,
      rating_gap: 3,
      other_user_id: other,
    });
  });
  it('팔로우 0명·세션 없음은 다른 사람 정보를 반환하지 않는다', async () => {
    await db.exec('DELETE FROM follows');
    expect((await social()).genres).toEqual([{ user_id: me, categories: [] }]);
    await db.exec("SELECT set_config('request.jwt.claim.sub','',false)");
    expect(await social()).toBeNull();
  });
  it('첨부와 고정 문구로 알림을 만들고 알림을 지워도 하루 제한은 유지한다', async () => {
    const book = await addBook({ status: 'reading' });
    await send(other, 'wait', book);
    expect(
      (await db.query('SELECT type,message,target_id FROM notifications'))
        .rows[0]
    ).toEqual({
      type: 'reading_nudge',
      message: '기다려, 다음 책 골랐다 📖',
      target_id: book,
    });
    await db.exec('DELETE FROM notifications');
    await expect(send()).rejects.toThrow('오늘은 이미');
    await db.exec('UPDATE reading_nudge_limits SET sent_day = sent_day - 1');
    await send();
  });
  it('수신 거부·자기 자신·미팔로우·비공개 첨부·임의 문구를 차단한다', async () => {
    await expect(send(me)).rejects.toThrow();
    await expect(send(stranger)).rejects.toThrow();
    await expect(send(other, '임의 문구')).rejects.toThrow();
    await expect(
      send(other, 'together', await addBook({ is_public: false }))
    ).rejects.toThrow();
    await db.query('INSERT INTO reading_nudge_settings VALUES($1,false)', [
      other,
    ]);
    await expect(send()).rejects.toThrow('알림을 꺼두었어요');
    expect((await db.query('SELECT * FROM notifications')).rows).toEqual([]);
  });
  it('로그인 역할도 직접 알림 INSERT로 발송 제한을 우회하지 못한다', async () => {
    await db.exec('SET ROLE authenticated');
    try {
      await expect(
        db.query(
          "INSERT INTO notifications(user_id,actor_id,type,message) VALUES($1,$2,'reading_nudge','위조')",
          [other, me]
        )
      ).rejects.toThrow(/row-level security/);
      await expect(
        db.query(
          'INSERT INTO reading_nudge_limits(actor_id,user_id) VALUES($1,$2)',
          [me, other]
        )
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query('INSERT INTO reading_nudge_settings VALUES($1,false)', [other])
      ).rejects.toThrow(/row-level security/);
      await send();
    } finally {
      await db.exec('RESET ROLE');
    }
  });
  it('두 함수는 익명 실행이 불가능하고 로그인 역할에만 열려 있다', async () => {
    for (const signature of [
      'public.get_following_reading_social()',
      'public.send_reading_nudge(uuid,text,uuid)',
    ]) {
      const result = await db.query<{ anon: boolean; authenticated: boolean }>(
        "SELECT has_function_privilege('anon',$1,'EXECUTE') AS anon,has_function_privilege('authenticated',$1,'EXECUTE') AS authenticated",
        [signature]
      );
      expect(result.rows[0]).toEqual({ anon: false, authenticated: true });
    }
  });
});
