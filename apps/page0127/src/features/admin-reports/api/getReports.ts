import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

export type CommentSource = 'book' | 'story';

/** 어드민 신고 목록 한 줄 */
export type ReportRow = {
  id: string;
  reason: string;
  detail: string | null;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
  handledAt: string | null;
  /** 신고자 — 탈퇴하면 null 이 된다 */
  reporterName: string | null;
  comment: {
    id: string;
    /** 어느 표의 댓글인지 — 책 댓글(book_comments) / 책 이야기 댓글(story_comments) */
    source: CommentSource;
    content: string;
    isHidden: boolean;
    authorName: string | null;
    authorId: string | null;
  } | null;
};

type RawReport = {
  id: string;
  reason: string;
  detail: string | null;
  status: ReportRow['status'];
  created_at: string;
  handled_at: string | null;
  reporter_id: string | null;
  comment_id: string | null;
  story_comment_id: string | null;
};

type RawComment = {
  id: string;
  content: string;
  is_hidden: boolean;
  user_id: string | null;
};

/**
 * 신고 목록을 미처리 먼저, 그 안에서 최신순으로.
 *
 * service_role 로 읽는다 — RLS 는 "내 신고만"이라 운영자가 남의 신고를 볼 수 없다.
 * 어드민 기능은 전부 이 경로를 쓴다(admin-members 와 같은 방식).
 *
 * 조인을 PostgREST 임베딩으로 하지 않고 따로 조회해 합친다. book_comments 와
 * profiles 사이에 선언된 FK 가 없어(user_id 는 auth.users 를 가리킨다) 임베딩이
 * 스키마 캐시에서 실패하기 때문이다.
 */
export const getReports = async (): Promise<ReportRow[]> => {
  // 레이아웃의 확인만으로는 부족하다 — 레이아웃과 페이지는 병렬로 렌더링돼서, 레이아웃이 404 를
  // 던져도 이 함수의 결과가 응답(RSC 데이터)에 실릴 수 있다. 데이터를 꺼내는 곳에서 다시 확인한다.
  await assertAdmin();
  const supabase = createAdminClient();

  const { data: reports, error } = await supabase
    .from('reports')
    .select(
      'id, reason, detail, status, created_at, handled_at, reporter_id, comment_id, story_comment_id'
    )
    // 미처리를 위로: pending < rejected < resolved 가 아니라 명시적으로 status 정렬
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('신고 목록 조회 실패:', error.message);
    return [];
  }

  const rows = (reports ?? []) as RawReport[];
  if (rows.length === 0) return [];

  // 댓글 본문 — 가려진 것도 함께 가져온다(service_role 은 RLS 를 우회한다).
  // 책 댓글과 책 이야기 댓글은 표가 달라서 각각 받는다(HJ, 2026-11-27 B안).
  const idsOf = (pick: (r: RawReport) => string | null) => [
    ...new Set(rows.map(pick).filter((id): id is string => !!id)),
  ];
  const bookCommentIds = idsOf((r) => r.comment_id);
  const storyCommentIds = idsOf((r) => r.story_comment_id);
  const [{ data: bookComments }, { data: storyComments }] = await Promise.all([
    bookCommentIds.length > 0
      ? supabase
          .from('book_comments')
          .select('id, content, is_hidden, user_id')
          .in('id', bookCommentIds)
      : Promise.resolve({ data: [] }),
    storyCommentIds.length > 0
      ? supabase
          .from('story_comments')
          .select('id, content, is_hidden, user_id')
          .in('id', storyCommentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const comments = [
    ...((bookComments ?? []) as RawComment[]),
    ...((storyComments ?? []) as RawComment[]),
  ];
  const commentById = new Map(comments.map((c) => [c.id, c]));

  // 신고자·작성자 이름
  const userIds = [
    ...new Set(
      [
        ...rows.map((r) => r.reporter_id),
        ...comments.map((c) => c.user_id),
      ].filter((id): id is string => !!id)
    ),
  ];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, username')
    .in('id', userIds);
  const nameById = new Map(
    (profiles ?? []).map((p: { id: string; nickname: string | null; username: string | null }) => [
      p.id,
      p.nickname || p.username,
    ])
  );

  return rows.map((r) => {
    const source: CommentSource = r.story_comment_id ? 'story' : 'book';
    const commentId = r.story_comment_id ?? r.comment_id;
    const comment = commentId ? commentById.get(commentId) : undefined;
    return {
      id: r.id,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      createdAt: r.created_at,
      handledAt: r.handled_at,
      reporterName: r.reporter_id ? (nameById.get(r.reporter_id) ?? null) : null,
      comment: comment
        ? {
            id: comment.id,
            source,
            content: comment.content,
            isHidden: comment.is_hidden,
            authorId: comment.user_id,
            authorName: comment.user_id
              ? (nameById.get(comment.user_id) ?? null)
              : null,
          }
        : // 댓글이 지워지면 CASCADE 로 신고도 사라지므로 보통 여기 오지 않는다.
          // 조회 사이의 경합으로 비는 경우를 위해 남겨 둔다.
          null,
    };
  });
};

/** 미처리 건수 — 어드민 네비게이션 뱃지에 쓴다 */
export const getPendingReportCount = async (): Promise<number> => {
  // 레이아웃의 확인만으로는 부족하다 — 레이아웃과 페이지는 병렬로 렌더링돼서, 레이아웃이 404 를
  // 던져도 이 함수의 결과가 응답(RSC 데이터)에 실릴 수 있다. 데이터를 꺼내는 곳에서 다시 확인한다.
  await assertAdmin();
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('미처리 신고 수 조회 실패:', error.message);
    return 0;
  }
  return count ?? 0;
};
