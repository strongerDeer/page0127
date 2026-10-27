import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const db = new PGlite();
const sender = '00000000-0000-0000-0000-000000000001';
const receiver = '00000000-0000-0000-0000-000000000002';
const stranger = '00000000-0000-0000-0000-000000000003';
const login = async (id: string) => {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
};
const addBook = async (overrides: Record<string, unknown> = {}) => {
  const book = {
    id: crypto.randomUUID(),
    user_id: sender,
    isbn: 'ISBN-A',
    title: '추천 책',
    status: 'completed',
    is_public: true,
    rating: 5,
    read_count: 3,
    completed_date: '2026-02-01',
    completed_year: 2026,
    one_line_review: '내 감상',
    personal_memo: '비밀 메모',
    source: 'yes24',
    provider_item_id: 'item-a',
    ...overrides,
  };
  const keys = Object.keys(book);
  await db.query(
    `INSERT INTO books(${keys.join(',')}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(',')})`,
    Object.values(book)
  );
  return book.id;
};
const send = async (book: string | null, kind = 'invitation') => {
  await login(sender);
  const result = await db.query<{ id: string }>(
    "SELECT send_reading_envelope($1,'together',$2,$3) AS id",
    [receiver, book, kind]
  );
  await login(receiver);
  return result.rows[0].id;
};
type Response = {
  book_id: string;
  status: string;
  outcome: string;
  saved_at: string;
  accepted_at: string | null;
};
const respond = async (id: string, action = 'accept', isPublic = true) =>
  (
    await db.query<{ value: Response }>(
      'SELECT respond_reading_envelope($1,$2,$3) AS value',
      [id, action, isPublic]
    )
  ).rows[0].value;

beforeAll(async () => {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,anon;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE follows(follower_id uuid,following_id uuid);
    CREATE TABLE books(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,isbn text,title text,
      sub_title text,author text,publisher text,cover_image text,spine_image text,description text,pub_date text,
      category text,page_count int,source text,provider_item_id text,status text,is_public boolean DEFAULT true,
      rating int,is_life_book boolean DEFAULT false,read_count int DEFAULT 1,start_date date,completed_date date,completed_year int,
      one_line_review text,personal_memo text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE global_books(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),isbn text UNIQUE,title text,author text,cover_image text,source text,provider_item_id text);
    CREATE TABLE activities(id uuid DEFAULT gen_random_uuid(),user_id uuid,book_id uuid,activity_type text);
    CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,actor_id uuid,
      type text,message text,target_id uuid,target_type text);
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,UPDATE,INSERT ON notifications TO authenticated;
    CREATE POLICY own_notifications ON notifications FOR SELECT USING(auth.uid()=user_id);
    CREATE POLICY update_notifications ON notifications FOR UPDATE USING(auth.uid()=user_id);
  `);
  for (const name of [
    '20261025000003_lounge_social_battles.sql',
    '20261026000000_reading_envelope_actions.sql',
    '20261027000001_envelope_life_book_completion.sql',
  ]) {
    await db.exec(
      readFileSync(
        fileURLToPath(
          new URL(
            `../../../../../../supabase/migrations/${name}`,
            import.meta.url
          )
        ),
        'utf8'
      )
    );
  }
}, 30_000);
beforeEach(async () => {
  await db.exec(
    'RESET ROLE; TRUNCATE auth.users,global_books,books,follows,notifications,activities,reading_nudge_settings,reading_nudge_limits,reading_envelopes CASCADE'
  );
  for (const id of [sender, receiver, stranger])
    await db.query('INSERT INTO auth.users VALUES($1)', [id]);
  await db.query('INSERT INTO follows VALUES($1,$2)', [sender, receiver]);
  await login(sender);
});
afterAll(async () => {
  await db.close();
});

describe('책 봉투 서재 등록 RPC', () => {
  it('추천을 담을 때 서지정보만 복사하고 감상·회독·완독 연도는 복사하지 않는다', async () => {
    const id = await send(await addBook(), 'recommendation');
    const result = await respond(id, 'save', false);
    const book = (
      await db.query('SELECT * FROM books WHERE id=$1', [result.book_id])
    ).rows[0];
    expect(book).toMatchObject({
      user_id: receiver,
      title: '추천 책',
      status: 'want_to_read',
      is_public: false,
      rating: null,
      read_count: 1,
      completed_date: null,
      completed_year: null,
      one_line_review: null,
      personal_memo: null,
    });
    expect(result.accepted_at).toBeNull();
  });
  it('초대 수락은 서울 날짜로 읽는 중 등록하고 다시 눌러도 같은 기록을 돌려준다', async () => {
    const id = await send(await addBook());
    const first = await respond(id);
    expect(first.status).toBe('reading');
    expect(first.accepted_at).toBeTruthy();
    expect((await respond(id)).book_id).toBe(first.book_id);
    expect((await db.query('SELECT * FROM activities')).rows).toHaveLength(1);
    expect(
      (
        await db.query<{ correct: boolean }>(
          "SELECT start_date = (now() AT TIME ZONE 'Asia/Seoul')::date AS correct FROM books WHERE id=$1",
          [first.book_id]
        )
      ).rows[0].correct
    ).toBe(true);
  });
  it('담은 뒤 수락하면 새 회독 없이 기존 읽고 싶어요를 읽는 중으로 바꾼다', async () => {
    const id = await send(await addBook());
    const saved = await respond(id, 'save', false);
    const accepted = await respond(id);
    expect(accepted).toMatchObject({
      book_id: saved.book_id,
      status: 'reading',
      outcome: 'started',
    });
    expect(
      (
        await db.query<{ is_public: boolean }>(
          'SELECT is_public FROM books WHERE id=$1',
          [saved.book_id]
        )
      ).rows[0].is_public
    ).toBe(false);
  });
  it('기존 완독 기록과 완료 연도·별점은 유지하고 수락했다고 표시하지 않는다', async () => {
    const own = await addBook({ user_id: receiver });
    const id = await send(await addBook());
    expect(await respond(id)).toMatchObject({
      book_id: own,
      status: 'completed',
      accepted_at: null,
    });
    expect(
      (
        await db.query(
          'SELECT read_count,rating,completed_year FROM books WHERE id=$1',
          [own]
        )
      ).rows[0]
    ).toEqual({ read_count: 3, rating: 5, completed_year: 2026 });
  });
  it('ISBN이 달라도 같은 공급자 상품이면 중복으로 담지 않는다', async () => {
    const own = await addBook({
      user_id: receiver,
      isbn: 'legacy-code',
      status: 'reading',
    });
    const id = await send(await addBook());
    expect((await respond(id)).book_id).toBe(own);
  });
  it('다른 날 받은 같은 수기 책은 재사용하고 동명의 다른 수기 책은 합치지 않는다', async () => {
    const source = await addBook({ isbn: '', provider_item_id: null });
    const first = await respond(await send(source), 'save');
    await db.exec('DELETE FROM reading_nudge_limits');
    const second = await respond(await send(source), 'save');
    expect(second.book_id).toBe(first.book_id);
    await db.exec('DELETE FROM reading_nudge_limits');
    const other = await addBook({ isbn: '', provider_item_id: null });
    expect((await respond(await send(other), 'save')).book_id).not.toBe(
      first.book_id
    );
  });
  it('다른 사람의 봉투·추천의 수락·비공개로 바뀐 첨부를 거부한다', async () => {
    const source = await addBook();
    const id = await send(source, 'recommendation');
    await expect(respond(id)).rejects.toThrow('초대장만');
    await login(stranger);
    await expect(respond(id, 'save')).rejects.toThrow('찾을 수 없어요');
    await login(receiver);
    await db.query('UPDATE books SET is_public=false WHERE id=$1', [source]);
    await expect(respond(id, 'save')).rejects.toThrow('첨부한 책');
  });
  it('삭제된 첨부·책 없는 초대·비로그인도 거부한다', async () => {
    await expect(send(null)).rejects.toThrow('책을 골라');
    const source = await addBook();
    const id = await send(source);
    await db.query('DELETE FROM books WHERE id=$1', [source]);
    await expect(respond(id)).rejects.toThrow('첨부한 책');
    await login('');
    await expect(respond(id)).rejects.toThrow('로그인');
  });
  it('알림 본문을 변조해도 원래 첨부를 사용하며 수락 테이블은 직접 수정할 수 없다', async () => {
    const source = await addBook();
    const fake = await addBook({
      title: '다른 책',
      isbn: 'B',
      provider_item_id: 'B',
    });
    const id = await send(source);
    await db.exec('SET ROLE authenticated');
    await db.query('UPDATE notifications SET target_id=$1 WHERE id=$2', [
      fake,
      id,
    ]);
    await expect(
      db.query(
        'UPDATE reading_envelopes SET source_book_id=$1 WHERE notification_id=$2',
        [fake, id]
      )
    ).rejects.toThrow('permission denied');
    const result = await respond(id);
    await db.exec('RESET ROLE');
    expect(
      (
        await db.query<{ title: string }>(
          'SELECT title FROM books WHERE id=$1',
          [result.book_id]
        )
      ).rows[0].title
    ).toBe('추천 책');
    await login(sender);
    await db.exec('SET ROLE authenticated');
    expect((await db.query('SELECT * FROM reading_envelopes')).rows).toEqual(
      []
    );
  });
  it('기존 앱 내 수신 설정만으로는 푸시가 켜지지 않으며 익명에게 RPC를 열지 않는다', async () => {
    await db.query('INSERT INTO reading_nudge_settings(user_id) VALUES($1)', [
      receiver,
    ]);
    expect(
      (
        await db.query<{ push_enabled: boolean }>(
          'SELECT push_enabled FROM reading_nudge_settings'
        )
      ).rows[0].push_enabled
    ).toBe(false);
    await db.exec('SET ROLE anon');
    await expect(respond(crypto.randomUUID())).rejects.toThrow(
      'permission denied'
    );
  });
});

describe('검색한 책과 직접 작성한 메시지', () => {
  it('내 서재에 없는 책도 추천하고 받는 사람만 서재에 담는다', async () => {
    const catalog = crypto.randomUUID();
    await db.query(
      "INSERT INTO global_books(id,isbn,title,author,source,provider_item_id) VALUES($1,'9788937460449','데미안','헤르만 헤세','yes24','book-item')",
      [catalog]
    );
    const result = await db.query<{ id: string }>(
      "SELECT send_reading_envelope($1,'네 취향일 것 같아',NULL,'recommendation',$2,240) AS id",
      [receiver, catalog]
    );
    expect((await db.query('SELECT * FROM books')).rows).toHaveLength(0);
    expect(
      (await db.query('SELECT message FROM notifications')).rows[0]
    ).toEqual({ message: '네 취향일 것 같아' });
    await login(receiver);
    const reply = await respond(result.rows[0].id, 'save', false);
    expect(
      (
        await db.query(
          'SELECT user_id,title,page_count,status,is_public FROM books WHERE id=$1',
          [reply.book_id]
        )
      ).rows[0]
    ).toEqual({
      user_id: receiver,
      title: '데미안',
      page_count: 240,
      status: 'want_to_read',
      is_public: false,
    });
  });
  it('완독 저장 전에는 기록이 없고 연도와 별점을 내 입력대로 저장한다', async () => {
    const id = await send(await addBook());
    expect(
      (await db.query('SELECT * FROM books WHERE user_id=$1', [receiver])).rows
    ).toHaveLength(0);
    const reply = (
      await db.query<{ value: Response }>(
        "SELECT respond_reading_envelope($1,'complete',false,NULL,2024,4) AS value",
        [id]
      )
    ).rows[0].value;
    expect(
      (
        await db.query(
          'SELECT status,completed_date,completed_year,rating,is_public FROM books WHERE id=$1',
          [reply.book_id]
        )
      ).rows[0]
    ).toEqual({
      status: 'completed',
      completed_date: null,
      completed_year: 2024,
      rating: 4,
      is_public: false,
    });
    await respond(id, 'complete');
    expect(
      (await db.query('SELECT rating FROM books WHERE id=$1', [reply.book_id]))
        .rows[0]
    ).toEqual({ rating: 4 });
    expect((await db.query('SELECT * FROM activities')).rows).toHaveLength(1);
  });
  it('읽는 중인 내 기록을 완독으로 전환하고 기존 비공개 설정을 보존한다', async () => {
    const own = await addBook({
      user_id: receiver,
      status: 'reading',
      is_public: false,
      completed_date: null,
      completed_year: null,
      rating: null,
    });
    const id = await send(await addBook());
    const reply = (
      await db.query<{ value: Response }>(
        "SELECT respond_reading_envelope($1,'complete',true,'2025-01-02',NULL,3) AS value",
        [id]
      )
    ).rows[0].value;
    expect(reply).toMatchObject({
      book_id: own,
      status: 'completed',
      outcome: 'completed',
    });
    expect(
      (await db.query('SELECT is_public,rating FROM books WHERE id=$1', [own]))
        .rows[0]
    ).toEqual({ is_public: false, rating: 3 });
  });
  it('미래 날짜·날짜와 연도 동시 입력·잘못된 별점은 거부하고 기록을 만들지 않는다', async () => {
    const id = await send(await addBook());
    for (const [date, year, rating] of [
      ['2999-01-01', null, 3],
      ['2024-01-01', 2024, 3],
      [null, 2024, 9],
    ]) {
      await expect(
        db.query(
          "SELECT respond_reading_envelope($1,'complete',true,$2,$3,$4)",
          [id, date, year, rating]
        )
      ).rejects.toThrow('별점');
    }
    expect(
      (await db.query('SELECT * FROM books WHERE user_id=$1', [receiver])).rows
    ).toHaveLength(0);
  });
  it('책 없는 한마디는 전송하고 빈 메시지와 팔로우 없는 전송은 막는다', async () => {
    await expect(
      db.query("SELECT send_reading_envelope($1,'   ',NULL,'note')", [receiver])
    ).rejects.toThrow('1~200');
    await db.query(
      "SELECT send_reading_envelope($1,'요즘 어때?',NULL,'note')",
      [receiver]
    );
    await db.exec('DELETE FROM reading_nudge_limits; DELETE FROM follows');
    await expect(
      db.query("SELECT send_reading_envelope($1,'안녕',NULL,'note')", [
        receiver,
      ])
    ).rejects.toThrow('팔로우');
  });
});

describe('편지에서 인생책 완독 등록', () => {
  it('인생책은 별점 5점과 함께 원자적으로 저장한다', async () => {
    const id = await send(await addBook());
    const reply = (
      await db.query<{ value: Response }>(
        "SELECT respond_reading_envelope($1,'complete',false,NULL,2024,3,NULL,true) AS value",
        [id]
      )
    ).rows[0].value;
    expect(
      (
        await db.query(
          'SELECT rating,is_life_book,status,is_public FROM books WHERE id=$1',
          [reply.book_id]
        )
      ).rows[0]
    ).toEqual({
      rating: 5,
      is_life_book: true,
      status: 'completed',
      is_public: false,
    });
  });
  it('평가 안 함은 0점으로 저장하고 인생책 표시는 하지 않는다', async () => {
    const id = await send(await addBook());
    const reply = (
      await db.query<{ value: Response }>(
        "SELECT respond_reading_envelope($1,'complete',true,NULL,NULL,0,NULL,false) AS value",
        [id]
      )
    ).rows[0].value;
    expect(
      (
        await db.query('SELECT rating,is_life_book FROM books WHERE id=$1', [
          reply.book_id,
        ])
      ).rows[0]
    ).toEqual({ rating: 0, is_life_book: false });
  });
  it('기존 완독의 인생책·별점은 다른 초대로 덮어쓰지 않는다', async () => {
    const own = await addBook({
      user_id: receiver,
      rating: 4,
      is_life_book: false,
    });
    const id = await send(await addBook());
    await db.query(
      "SELECT respond_reading_envelope($1,'complete',true,NULL,NULL,5,NULL,true)",
      [id]
    );
    expect(
      (
        await db.query('SELECT rating,is_life_book FROM books WHERE id=$1', [
          own,
        ])
      ).rows[0]
    ).toEqual({ rating: 4, is_life_book: false });
  });
  it('공통 등록과 같은 연도 하한을 적용하고 내부 함수는 직접 실행할 수 없다', async () => {
    const id = await send(await addBook());
    await expect(
      db.query(
        "SELECT respond_reading_envelope($1,'complete',true,NULL,1899,3,NULL,false)",
        [id]
      )
    ).rejects.toThrow('완독 시점');
    await db.exec('SET ROLE authenticated');
    await expect(
      db.query("SELECT respond_reading_envelope_base($1,'save')", [id])
    ).rejects.toThrow('permission denied');
  });
});
