import type { Notification, NotificationTarget } from '@/entities/notification';
import type { SupabaseClient } from '@supabase/supabase-js';

/** 푸시 쪽은 삽입하는 행을 그대로 넘겨서 대상 칸이 없을 수 있다 */
type TargetNotification = Pick<Notification, 'user_id' | 'type'> &
  Partial<Pick<Notification, 'target_id' | 'target_type'>>;

type BookRow = { id: string; title: string; user_id: string };
type GlobalBookRow = { id: string; title: string };

/**
 * 알림 한 건이 가리키는 책의 제목과 답글 여부 — 문장을 만드는 쪽(목록·푸시)이 함께 쓴다.
 *
 * 알림 행에는 "답글"이라는 표시가 없다. 댓글 알림은 책 주인에게, 답글 알림은 부모 댓글
 * 작성자에게 가므로 **받는 사람이 책 주인이 아니면 답글이다.** 전역 책은 주인이 없어서
 * 그쪽 알림은 늘 답글이다(global-books/[id]/comments).
 *
 * 책을 못 읽으면(비공개·삭제) 제목도 답글 여부도 모른다 → 예전 문장으로 돌아간다.
 */
export const toNotificationTarget = (
  notification: TargetNotification,
  books: Map<string, BookRow>,
  globalBooks: Map<string, GlobalBookRow>
): NotificationTarget | null => {
  const { type, target_id, target_type } = notification;
  if (
    (type !== 'comment' && type !== 'like' && type !== 'reading_nudge') ||
    !target_id
  )
    return null;

  if (target_type === 'global_book') {
    const globalBook = globalBooks.get(target_id);
    return { title: globalBook?.title ?? null, isReply: type === 'comment' };
  }
  if (target_type !== 'book') return null;

  const book = books.get(target_id);
  if (!book) return null;
  return {
    title: book.title,
    isReply: type === 'comment' && book.user_id !== notification.user_id,
  };
};

const idsOf = (
  notifications: TargetNotification[],
  targetType: Notification['target_type']
) => [
  ...new Set(
    notifications
      .filter((n) => n.target_type === targetType && n.target_id)
      .map((n) => n.target_id as string)
  ),
];

/**
 * 알림들이 가리키는 책을 한 번에 읽어 target 을 붙일 준비를 한다.
 *
 * 목록 API 는 사용자 클라이언트(RLS 로 읽을 수 있는 책만), 푸시는 관리자 클라이언트로 부른다.
 * 실패하면 빈 결과 — 제목은 곁들이는 정보라 알림 자체를 막지 않는다.
 */
export const loadNotificationTargets = async (
  supabase: SupabaseClient,
  notifications: TargetNotification[]
): Promise<(notification: TargetNotification) => NotificationTarget | null> => {
  const bookIds = idsOf(notifications, 'book');
  const globalBookIds = idsOf(notifications, 'global_book');

  const [booksResult, globalBooksResult] = await Promise.all([
    bookIds.length > 0
      ? supabase
          .from('books')
          .select('id, title, user_id')
          .in('id', bookIds)
          .returns<BookRow[]>()
      : null,
    globalBookIds.length > 0
      ? supabase
          .from('global_books')
          .select('id, title')
          .in('id', globalBookIds)
          .returns<GlobalBookRow[]>()
      : null,
  ]);

  if (booksResult?.error || globalBooksResult?.error) {
    console.error(
      '[notifications] 알림 대상 책 조회 실패:',
      booksResult?.error?.message ?? globalBooksResult?.error?.message
    );
  }

  const books = new Map((booksResult?.data ?? []).map((b) => [b.id, b]));
  const globalBooks = new Map(
    (globalBooksResult?.data ?? []).map((b) => [b.id, b])
  );

  return (notification) =>
    toNotificationTarget(notification, books, globalBooks);
};
