import { NextRequest } from 'next/server';

import { getSupabaseClient } from '../../../_helpers/auth';
import {
  buildCommentTree,
  classifyBookCommentError,
} from '../../../_helpers/bookComments';
import { mergeStreamItems } from '../../../_helpers/bookStream';
import { errorResponse, successResponse } from '../../../_helpers/response';

import type { CommentRow, ProfileRow } from '../../../_helpers/bookComments';
import type { StreamActivity } from '../../../_helpers/bookStream';

type Params = {
  params: Promise<{ id: string }>;
};

// 한 책의 댓글이 이보다 많으면 "이전 댓글 더보기"로 끊는다.
// 활동은 한 책당 보통 3~10개라 전부 싣는다.
const COMMENT_PAGE_SIZE = 50;

/**
 * GET /api/books/[id]/stream?before=<ISO>
 * 책 스트림 — 활동(상태 변화)과 댓글을 시간순으로 병합해 돌려준다
 *
 * 학습 포인트:
 * - before 커서: 오래된 댓글을 더 불러올 때 쓴다(offset보다 안정적 — 그 사이 새
 *   댓글이 달려도 이미 본 항목이 밀려 중복되지 않는다).
 * - 권한 판단을 앱에서 하지 않는다. RLS가 "볼 수 있는 책의 activities/book_comments"만
 *   돌려주므로 비공개 책(남의 것)이면 양쪽 다 빈 배열이 온다.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const before = request.nextUrl.searchParams.get('before');

    let commentQuery = supabase
      .from('book_comments')
      .select('id, user_id, parent_comment_id, content, created_at, updated_at')
      .eq('book_id', id)
      .order('created_at', { ascending: false })
      .limit(COMMENT_PAGE_SIZE + 1); // 하나 더 받아 hasMore를 판정한다

    if (before) commentQuery = commentQuery.lt('created_at', before);

    const [
      { data: activities, error: activityError },
      { data: commentRows, error: commentError },
    ] = await Promise.all([
      supabase
        .from('activities')
        .select('id, activity_type, content, created_at')
        .eq('book_id', id)
        .order('created_at', { ascending: true }),
      commentQuery,
    ]);

    if (activityError) {
      const { message, status } = classifyBookCommentError(activityError);
      return errorResponse(message, status);
    }
    if (commentError) {
      const { message, status } = classifyBookCommentError(commentError);
      return errorResponse(message, status);
    }

    const rows = (commentRows ?? []) as CommentRow[];
    const hasMore = rows.length > COMMENT_PAGE_SIZE;
    const pageRows = hasMore ? rows.slice(0, COMMENT_PAGE_SIZE) : rows;

    const userIds = [
      ...new Set(
        pageRows.map((r) => r.user_id).filter((v): v is string => !!v)
      ),
    ];
    const { data: profiles } =
      userIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, nickname, username, photo_url')
            .in('id', userIds)
        : { data: [] as ProfileRow[] };

    const streamActivities: StreamActivity[] = (activities ?? []).map((a) => ({
      kind: 'activity',
      id: a.id,
      activityType: a.activity_type,
      content: a.content,
      createdAt: a.created_at,
    }));

    const items = mergeStreamItems(
      streamActivities,
      buildCommentTree(pageRows, profiles ?? [])
    );

    return successResponse({ items, hasMore });
  } catch (error) {
    console.error('책 스트림 조회 에러:', error);
    return errorResponse('스트림 조회에 실패했습니다.');
  }
}
