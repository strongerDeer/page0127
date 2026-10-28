import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const me = '00000001-0000-0000-0000-000000000001';
const other = '00000002-0000-0000-0000-000000000002';
const reviewer = '00000003-0000-0000-0000-000000000003';
const migration = fileURLToPath(
  new URL(
    '../../../../../../supabase/migrations/20261028000000_book_catalog_review.sql',
    import.meta.url
  )
);
async function role(name: string, id = '') {
  await db.exec('RESET ROLE');
  await db.query<Record<string, unknown>>(
    "SELECT set_config('request.jwt.claim.role',$1,false),set_config('request.jwt.claim.sub',$2,false)",
    [name, id]
  );
  await db.exec(`SET ROLE ${name}`);
}
async function submit(isbn: string, isPublic = true) {
  await role('authenticated', me);
  return (
    await db.query<{
      id: string;
      is_public: boolean;
      requested_public: boolean;
      catalog_review_status: string;
    }>(
      `INSERT INTO books(user_id,isbn,title,author,is_public,source,cover_image,catalog_review_status)
     VALUES($1,$2,'테스트 책','테스트 저자',$3,'yes24','https://evil.test/a.jpg','approved') RETURNING *`,
      [me, isbn, isPublic]
    )
  ).rows[0];
}
async function review(
  isbn: string,
  decision: string,
  note = '',
  version?: number
) {
  await role('service_role');
  const g = (
    await db.query<{ id: string; review_version: number }>(
      'SELECT id,review_version FROM global_books WHERE isbn=$1',
      [isbn]
    )
  ).rows[0];
  return db.query<Record<string, unknown>>(
    'SELECT public.review_catalog_book($1,$2,$3,$4,$5)',
    [g.id, version ?? g.review_version, decision, note, reviewer]
  );
}
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${me}'),('${other}'),('${reviewer}');
    CREATE TABLE global_books(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),isbn text UNIQUE NOT NULL,title text NOT NULL,author text,publisher text,
      source text NOT NULL DEFAULT 'aladin',provider_item_id text,cover_image text,spine_image text,back_image text,sub_title text,description text,pub_date text,category text,created_at timestamptz DEFAULT now());
    CREATE TABLE books(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,isbn text,title text,author text,publisher text,source text,provider_item_id text,
      sub_title text,description text,pub_date text,category text,cover_image text,spine_image text,is_public boolean DEFAULT true,created_at timestamptz DEFAULT now());
    CREATE TABLE activities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,book_id uuid);
    ALTER TABLE global_books ENABLE ROW LEVEL SECURITY; ALTER TABLE books ENABLE ROW LEVEL SECURITY; ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
    CREATE POLICY public_catalog ON global_books FOR SELECT USING(true);
    CREATE POLICY insert_catalog ON global_books FOR INSERT TO authenticated WITH CHECK(true);
    CREATE POLICY select_books ON books FOR SELECT USING(is_public OR user_id=auth.uid());
    CREATE POLICY insert_books ON books FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
    CREATE POLICY update_books ON books FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY follower_activities ON activities FOR SELECT USING(true);
    INSERT INTO global_books(isbn,title,source) VALUES('trusted','서점 검증 책','yes24');
    INSERT INTO global_books(isbn,title,source,cover_image) VALUES('old-manual','기존 직접 등록','manual','https://evil.test/old.jpg');
    INSERT INTO books(user_id,isbn,title,is_public) VALUES('${me}','old-manual','기존 직접 등록',true);
    INSERT INTO books(user_id,isbn,title,author,is_public) VALUES('${me}','orphan','공용 정보 누락','저자',true);
  `);
  await db.exec(readFileSync(migration, 'utf8'));
  await db.exec(`GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,anon,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid(),auth.role() TO authenticated,anon,service_role;`);
});
afterAll(() => db.close());

describe('도서 검수 DB 보안과 상태 전이', () => {
  it('기존 공급자 도서는 보존하고 수동 도서·표지는 비공개로 전환한다', async () => {
    await role('service_role');
    expect(
      (
        await db.query<Record<string, unknown>>(
          "SELECT review_status FROM global_books WHERE isbn='trusted'"
        )
      ).rows[0].review_status
    ).toBe('approved');
    const b = (
      await db.query<Record<string, unknown>>(
        "SELECT is_public,catalog_review_status,cover_image FROM books WHERE isbn='old-manual'"
      )
    ).rows[0];
    expect(b).toMatchObject({
      is_public: false,
      catalog_review_status: 'pending',
      cover_image: null,
    });
  });
  it('카탈로그가 누락된 기존 기록도 제출자를 보존해 대기 상태로 전환한다', async () => {
    await role('authenticated', me);
    expect(
      (
        await db.query<{ review_status: string; submitted_by: string }>(
          "SELECT review_status,submitted_by FROM global_books WHERE isbn='orphan'"
        )
      ).rows[0]
    ).toEqual({ review_status: 'pending', submitted_by: me });
    expect(
      (
        await db.query<{ is_public: boolean }>(
          "SELECT is_public FROM books WHERE isbn='orphan'"
        )
      ).rows[0].is_public
    ).toBe(false);
  });
  it('책 REST 직접 삽입과 승인 상태·출처 위조도 검수 대기가 된다', async () => {
    const b = await submit('manual:direct');
    expect(b).toMatchObject({
      is_public: false,
      requested_public: true,
      catalog_review_status: 'pending',
    });
    const g = (
      await db.query<Record<string, unknown>>(
        "SELECT source,review_status,cover_image FROM global_books WHERE isbn='manual:direct'"
      )
    ).rows[0];
    expect(g).toMatchObject({
      source: 'manual',
      review_status: 'pending',
      cover_image: null,
    });
    await db.query<Record<string, unknown>>(
      "UPDATE books SET is_public=true,catalog_review_status='approved' WHERE id=$1",
      [b.id]
    );
    expect(
      (
        await db.query<Record<string, unknown>>(
          'SELECT is_public FROM books WHERE id=$1',
          [b.id]
        )
      ).rows[0].is_public
    ).toBe(false);
  });
  it('남과 익명에게는 대기 책·공용 도서·팔로워 활동이 보이지 않는다', async () => {
    const b = await submit('manual:hidden');
    await role('service_role');
    await db.query<Record<string, unknown>>(
      'INSERT INTO activities(user_id,book_id) VALUES($1,$2)',
      [me, b.id]
    );
    for (const [name, id] of [
      ['authenticated', other],
      ['anon', ''],
    ]) {
      await role(name, id);
      expect(
        (
          await db.query<Record<string, unknown>>(
            "SELECT id FROM global_books WHERE isbn='manual:hidden'"
          )
        ).rows
      ).toHaveLength(0);
      expect(
        (
          await db.query<Record<string, unknown>>(
            'SELECT id FROM books WHERE id=$1',
            [b.id]
          )
        ).rows
      ).toHaveLength(0);
      expect(
        (
          await db.query<Record<string, unknown>>(
            'SELECT id FROM activities WHERE book_id=$1',
            [b.id]
          )
        ).rows
      ).toHaveLength(0);
    }
  });
  it('서점 ISBN에 다른 제목·표지를 넣어도 공용 정보로 정규화된다', async () => {
    const b = await submit('trusted');
    const data = (
      await db.query<Record<string, unknown>>(
        'SELECT title,cover_image,source FROM books WHERE id=$1',
        [b.id]
      )
    ).rows[0];
    expect(data).toMatchObject({
      title: '서점 검증 책',
      cover_image: null,
      source: 'yes24',
    });
  });
  it('승인은 처음 선택한 공개 여부를 따르고 반려 후 재승인해도 보존한다', async () => {
    const yes = await submit('manual:public', true);
    const no = await submit('manual:private', false);
    for (const isbn of ['manual:public', 'manual:private']) {
      await review(isbn, 'approved');
      await review(isbn, 'rejected', '출처 확인 필요');
      await review(isbn, 'approved');
    }
    await role('anon');
    expect(
      (
        await db.query<Record<string, unknown>>(
          'SELECT id FROM books WHERE id=$1',
          [yes.id]
        )
      ).rows
    ).toHaveLength(1);
    expect(
      (
        await db.query<Record<string, unknown>>(
          'SELECT id FROM books WHERE id=$1',
          [no.id]
        )
      ).rows
    ).toHaveLength(0);
  });
  it('대기 중 명시적으로 비공개로 바꾸면 승인 후에도 공개하지 않는다', async () => {
    const b = await submit('manual:change-privacy', true);
    await db.query('UPDATE books SET is_public=false WHERE id=$1', [b.id]);
    await review('manual:change-privacy', 'approved');
    await role('authenticated', me);
    const current = (
      await db.query<{ is_public: boolean; requested_public: boolean }>(
        'SELECT is_public,requested_public FROM books WHERE id=$1',
        [b.id]
      )
    ).rows[0];
    expect(current).toEqual({ is_public: false, requested_public: false });
  });
  it('보완 후 다시 대기하며 오래된 버전 승인과 타인 수정을 막는다', async () => {
    await submit('manual:resubmit');
    await review(
      'manual:resubmit',
      'needs_changes',
      '출판사 주소를 알려주세요.'
    );
    await role('authenticated', me);
    const before = (
      await db.query<Record<string, unknown>>(
        "SELECT id,review_version FROM global_books WHERE isbn='manual:resubmit'"
      )
    ).rows[0];
    await db.query<Record<string, unknown>>(
      "UPDATE global_books SET title='보완한 제목',source_url='https://publisher.test/book',review_status='approved' WHERE id=$1",
      [before.id]
    );
    expect(
      (
        await db.query<Record<string, unknown>>(
          'SELECT review_status FROM global_books WHERE id=$1',
          [before.id]
        )
      ).rows[0].review_status
    ).toBe('pending');
    await expect(
      review('manual:resubmit', 'approved', '', Number(before.review_version))
    ).rejects.toThrow(/변경/);
    await role('authenticated', other);
    expect(
      (
        await db.query<Record<string, unknown>>(
          "UPDATE global_books SET title='남의 수정' WHERE id=$1 RETURNING id",
          [before.id]
        )
      ).rows
    ).toHaveLength(0);
  });
  it('사용자 검수 RPC 호출을 거절하고 반려 사유·감사 이력을 보장한다', async () => {
    await submit('manual:audit');
    await role('authenticated', me);
    await expect(
      db.query<Record<string, unknown>>(
        'SELECT review_catalog_book($1,1,$2,$3,$4)',
        [me, 'approved', '', me]
      )
    ).rejects.toThrow(/permission denied/);
    await expect(review('manual:audit', 'rejected')).rejects.toThrow(/사유/);
    await review(
      'manual:audit',
      'rejected',
      '실제 도서인지 확인할 수 없습니다.'
    );
    const history = (
      await db.query<Record<string, unknown>>(
        "SELECT note,book_snapshot FROM book_review_history h JOIN global_books g ON g.id=h.global_book_id WHERE g.isbn='manual:audit'"
      )
    ).rows;
    expect(history).toHaveLength(1);
    expect(history[0].note).toBe('실제 도서인지 확인할 수 없습니다.');
    await role('authenticated', me);
    expect(
      (
        await db.query<Record<string, unknown>>(
          'SELECT * FROM book_review_history'
        )
      ).rows
    ).toHaveLength(0);
  });
});
