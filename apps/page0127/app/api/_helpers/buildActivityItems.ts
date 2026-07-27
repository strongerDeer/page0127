import { compareIsoTime } from './bookComments';

import type { Activity } from '@/entities/activity';

// 조회 결과 원본 타입 — Supabase에서 그대로 받은 행 모양
export type RawActivity = {
  id: string;
  user_id: string;
  activity_type: 'book_added' | 'book_completed' | 'review_added';
  book_id: string;
  content: string | null;
  created_at: string;
};
export type RawProfile = {
  id: string;
  nickname: string | null;
  username?: string | null;
  photo_url: string | null;
};
export type RawBook = {
  id: string;
  title: string;
  author: string;
  cover_image: string | null;
  status: string;
  rating: number | null;
  one_line_review: string | null;
};
/** 책 단위 좋아요 — activity_id 가 아니라 book_id 로 센다 */
export type RawLike = { book_id: string; user_id: string };
/** 배지·개수 계산에 필요한 최소 컬럼만 받는다(본문은 피드에 필요 없다) */
export type RawComment = {
  book_id: string;
  user_id: string | null;
  created_at: string;
};
export type RawThreadRead = { book_id: string; last_read_at: string };
export type RawBookEvent = {
  book_id: string;
  activity_type: RawActivity['activity_type'];
  created_at: string;
};

type BuildInput = {
  activities: RawActivity[];
  profiles: RawProfile[];
  books: RawBook[];
  likes: RawLike[];
  comments: RawComment[];
  threadReads: RawThreadRead[];
  bookEvents: RawBookEvent[];
  currentUserId: string | null;
};

/** book_id 로 묶는다 — 배치 조회 결과를 책마다 처음부터 훑지 않기 위한 준비 */
const groupByBook = <T extends { book_id: string }>(rows: T[]) => {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.book_id);
    if (list) list.push(row);
    else map.set(row.book_id, [row]);
  }
  return map;
};

/**
 * 조회 결과(활동/프로필/책/좋아요/댓글/열람/이벤트)를 화면용 Activity로 조합하는 순수 함수.
 *
 * 학습 포인트:
 * - I/O(조회)와 조합 로직을 분리하면 조합만 단위테스트할 수 있다. 라우트는 Supabase가
 *   있어야 돌지만 이 함수는 없어도 돈다.
 * - 좋아요·댓글은 이제 **활동이 아니라 책**에 달린다. 한 책이 카드 1장이므로 숫자 기준도
 *   책으로 통일해야 "댓글 12(책 전체) / ♡ 2(최신 활동)" 같은 어긋남이 안 생긴다.
 */
export function buildActivityItems({
  activities,
  profiles,
  books,
  likes,
  comments,
  threadReads,
  bookEvents,
  currentUserId,
}: BuildInput): Activity[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const bookMap = new Map(books.map((b) => [b.id, b]));
  const likesByBook = groupByBook(likes);
  const commentsByBook = groupByBook(comments);
  const eventsByBook = groupByBook(bookEvents);
  const lastReadByBook = new Map(
    threadReads.map((r) => [r.book_id, r.last_read_at])
  );

  return activities.map((a) => {
    const profile = profileMap.get(a.user_id);
    const book = bookMap.get(a.book_id);
    const bookLikes = likesByBook.get(a.book_id) ?? [];
    const bookComments = commentsByBook.get(a.book_id) ?? [];
    const lastReadAt = lastReadByBook.get(a.book_id);

    // 새 댓글: 마지막으로 읽은 뒤에 달렸고, 내가 쓴 것이 아닌 것.
    // 열람 기록이 없으면(한 번도 안 열었으면) 남이 쓴 댓글 전부가 새 댓글이다.
    // 시각 비교에 localeCompare 를 쓰면 안 된다 — 마이크로초 유무가 갈릴 때 뒤집힌다.
    const newCommentCount = bookComments.filter(
      (c) =>
        c.user_id !== currentUserId &&
        (!lastReadAt || compareIsoTime(c.created_at, lastReadAt) > 0)
    ).length;

    return {
      id: a.id,
      activity_type: a.activity_type,
      content: a.content,
      created_at: a.created_at,
      user: {
        id: a.user_id,
        // nickname 미설정 시 username으로 대체(username은 가입 시 항상 생성됨) → '익명' 대신 이름 노출
        nickname: profile?.nickname ?? profile?.username ?? null,
        // 링크 경로용 — 표시용 nickname 과 달리 폴백하지 않는다.
        // 없는 값으로 경로를 만들면 404가 되므로, 호출부가 없을 때를 판단하게 둔다.
        username: profile?.username ?? null,
        photo_url: profile?.photo_url ?? null,
      },
      book: book
        ? {
            id: book.id,
            title: book.title,
            author: book.author,
            cover_image: book.cover_image,
            status: book.status,
            rating: book.rating,
          }
        : null,
      likes: {
        count: bookLikes.length,
        isLiked: currentUserId
          ? bookLikes.some((l) => l.user_id === currentUserId)
          : false,
      },
      commentCount: bookComments.length,
      newCommentCount,
      // 중복 제거로 잃은 맥락을 되살린다 — "담음 7/01 · 완독 7/20"
      bookEvents: (eventsByBook.get(a.book_id) ?? [])
        .map((e) => ({
          activityType: e.activity_type,
          createdAt: e.created_at,
        }))
        .sort((x, y) => compareIsoTime(x.createdAt, y.createdAt)),
      // 리뷰 본문은 한줄평을 쓴다(review_added 활동은 생성 호출처가 없어 0건이다)
      reviewContent: book?.one_line_review ?? null,
    };
  });
}
