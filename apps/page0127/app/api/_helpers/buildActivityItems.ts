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
export type RawProfile = { id: string; nickname: string | null; username?: string | null; photo_url: string | null };
export type RawBook = {
  id: string;
  title: string;
  author: string;
  cover_image: string | null;
  status: string;
  rating: number | null;
};
export type RawLike = { activity_id: string; user_id: string };

type BuildInput = {
  activities: RawActivity[];
  profiles: RawProfile[];
  books: RawBook[];
  likes: RawLike[];
  currentUserId: string | null;
};

/**
 * 조회 결과(활동/프로필/책/좋아요)를 화면용 Activity로 조합하는 순수 함수.
 * 학습 포인트: I/O(조회)와 조합 로직을 분리하면 조합만 단위테스트할 수 있다.
 */
export function buildActivityItems({
  activities,
  profiles,
  books,
  likes,
  currentUserId,
}: BuildInput): Activity[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const bookMap = new Map(books.map((b) => [b.id, b]));

  return activities.map((a) => {
    const profile = profileMap.get(a.user_id);
    const book = bookMap.get(a.book_id);
    const activityLikes = likes.filter((l) => l.activity_id === a.id);

    return {
      id: a.id,
      activity_type: a.activity_type,
      content: a.content,
      created_at: a.created_at,
      user: {
        id: a.user_id,
        // nickname 미설정 시 username으로 대체(username은 가입 시 항상 생성됨) → '익명' 대신 이름 노출
        nickname: profile?.nickname ?? profile?.username ?? null,
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
        count: activityLikes.length,
        isLiked: currentUserId ? activityLikes.some((l) => l.user_id === currentUserId) : false,
      },
    };
  });
}
