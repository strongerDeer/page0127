import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const db = new PGlite();
const owner = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const book = '20000000-0000-0000-0000-000000000001';
const reread = '20000000-0000-0000-0000-000000000002';
const foreignBook = '20000000-0000-0000-0000-000000000003';
const call = async (
  resource: string,
  action: string,
  ids: string[],
  requestId = crypto.randomUUID(),
  before: string | null = null
) =>
  (
    await db.query<{ result: { count: number; ids: string[] } }>(
      'SELECT public.perform_bulk_action($1,$2,$3,$4::uuid[],$5::timestamptz) AS result',
      [requestId, resource, action, ids, before]
    )
  ).rows[0].result;

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE public.books(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users, is_public boolean, updated_at timestamptz DEFAULT now());
    CREATE TABLE public.notifications(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users, target_id uuid, target_type text, is_read boolean, created_at timestamptz DEFAULT now());
    CREATE TABLE public.book_comments(id int PRIMARY KEY, book_id uuid REFERENCES books ON DELETE CASCADE);
    CREATE TABLE public.book_memos(id int PRIMARY KEY, book_id uuid REFERENCES books ON DELETE CASCADE);
    GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
  `);
  await db.exec(
    readFileSync(
      new URL(
        '../../../../../../supabase/migrations/20261027010000_bulk_management.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
});
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(`DELETE FROM public.book_comments; DELETE FROM public.book_memos; DELETE FROM public.notifications; DELETE FROM public.books; DELETE FROM auth.users;
    INSERT INTO auth.users VALUES ('${owner}'),('${other}');
    SELECT set_config('test.uid','${owner}',false);
    INSERT INTO books(id,user_id,is_public) VALUES ('${book}','${owner}',true),('${reread}','${owner}',true),('${foreignBook}','${other}',true);
    INSERT INTO book_comments VALUES (1,'${book}'); INSERT INTO book_memos VALUES (1,'${book}');
  `);
});

describe('atomic bulk management RPC', () => {
  it('changes only selected rereads, supports private → public, and deduplicates IDs', async () => {
    expect((await call('books', 'private', [book, book])).count).toBe(1);
    expect(
      (await db.query('SELECT id,is_public FROM books ORDER BY id')).rows
    ).toEqual([
      { id: book, is_public: false },
      { id: reread, is_public: true },
      { id: foreignBook, is_public: true },
    ]);
    await call('books', 'public', [book]);
    expect(
      (
        await db.query<{ is_public: boolean }>(
          'SELECT is_public FROM books WHERE id=$1',
          [book]
        )
      ).rows[0].is_public
    ).toBe(true);
  });
  it('rejects a mixed-owner batch without changing any record', async () => {
    await expect(call('books', 'private', [book, foreignBook])).rejects.toThrow(
      '변경할 수 없습니다'
    );
    expect(
      (
        await db.query<{ is_public: boolean }>(
          'SELECT is_public FROM books WHERE id=$1',
          [book]
        )
      ).rows[0].is_public
    ).toBe(true);
  });
  it('deletes linked comments, memos and notifications atomically, preserves other rereads and global targets', async () => {
    await db.exec(
      `INSERT INTO notifications VALUES ('30000000-0000-0000-0000-000000000001','${other}','${book}','book',false,now()),('30000000-0000-0000-0000-000000000002','${other}','${book}','global_book',false,now());`
    );
    expect((await call('books', 'delete', [book])).count).toBe(1);
    expect((await db.query('SELECT * FROM book_comments')).rows).toHaveLength(
      0
    );
    expect((await db.query('SELECT * FROM book_memos')).rows).toHaveLength(0);
    expect((await db.query('SELECT * FROM notifications')).rows).toHaveLength(
      1
    );
    expect((await db.query('SELECT * FROM books')).rows).toHaveLength(2);
  });
  it('rolls back notification cleanup if the book delete fails', async () => {
    await db.exec(
      `INSERT INTO notifications VALUES ('30000000-0000-0000-0000-000000000001','${other}','${book}','book',false,now()); CREATE FUNCTION fail_book_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$; CREATE TRIGGER fail_delete BEFORE DELETE ON books FOR EACH ROW EXECUTE FUNCTION fail_book_delete();`
    );
    try {
      await expect(call('books', 'delete', [book])).rejects.toThrow(
        'test failure'
      );
      expect((await db.query('SELECT * FROM notifications')).rows).toHaveLength(
        1
      );
      expect((await db.query('SELECT * FROM books')).rows).toHaveLength(3);
    } finally {
      await db.exec(
        'DROP TRIGGER fail_delete ON books; DROP FUNCTION fail_book_delete();'
      );
    }
  });
  it('replays the original result after delete and refuses request ID reuse with another payload', async () => {
    const requestId = crypto.randomUUID();
    const first = await call('books', 'delete', [book], requestId);
    expect(await call('books', 'delete', [book], requestId)).toEqual(first);
    await expect(call('books', 'delete', [reread], requestId)).rejects.toThrow(
      '새 요청 ID'
    );
  });
  it('deletes all old read notifications beyond the first page while preserving unread, new, and other users', async () => {
    await db.exec(`INSERT INTO notifications SELECT gen_random_uuid(),'${owner}',NULL,NULL,true,'2026-01-01' FROM generate_series(1,45);
      INSERT INTO notifications VALUES ('30000000-0000-0000-0000-000000000001','${owner}',NULL,NULL,false,'2026-01-01'),('30000000-0000-0000-0000-000000000002','${other}',NULL,NULL,true,'2026-01-01'),('30000000-0000-0000-0000-000000000003','${owner}',NULL,NULL,true,'2026-03-01');`);
    expect(
      (
        await call(
          'notifications',
          'delete_read',
          [],
          crypto.randomUUID(),
          '2026-02-01'
        )
      ).count
    ).toBe(45);
    expect((await db.query('SELECT * FROM notifications')).rows).toHaveLength(
      3
    );
  });
  it('selected notification deletion rejects a foreign ID and preserves unselected rows', async () => {
    const one = '30000000-0000-0000-0000-000000000001',
      two = '30000000-0000-0000-0000-000000000002';
    await db.exec(
      `INSERT INTO notifications VALUES ('${one}','${owner}',NULL,NULL,false,now()),('${two}','${other}',NULL,NULL,true,now());`
    );
    await expect(
      call('notifications', 'delete_selected', [one, two])
    ).rejects.toThrow('삭제할 수 없습니다');
    expect((await db.query('SELECT * FROM notifications')).rows).toHaveLength(
      2
    );
    expect((await call('notifications', 'delete_selected', [one])).count).toBe(
      1
    );
  });
  it('denies anonymous, malformed, oversized and empty operations, and receipts are inaccessible', async () => {
    await expect(call('books', 'delete', [])).rejects.toThrow('선택');
    await expect(
      call('books', 'delete', Array(501).fill(book))
    ).rejects.toThrow('500');
    await expect(
      db.query(
        'SELECT public.perform_bulk_action($1,NULL,NULL,$2::uuid[],now())',
        [crypto.randomUUID(), [book]]
      )
    ).rejects.toThrow('지원하지');
    await expect(call('books', 'delete_read', [book])).rejects.toThrow(
      '지원하지'
    );
    await db.exec("SELECT set_config('test.uid','',false)");
    await expect(call('books', 'delete', [book])).rejects.toThrow('로그인');
    await db.exec('SET ROLE authenticated');
    try {
      await expect(
        db.query('SELECT * FROM bulk_operation_receipts')
      ).rejects.toThrow('permission denied');
    } finally {
      await db.exec('RESET ROLE');
    }
  });
});
