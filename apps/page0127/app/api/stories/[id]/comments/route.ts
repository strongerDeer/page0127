import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import {
  buildCommentTree,
  classifyBookCommentError,
  COMMENT_MAX_LENGTH,
} from '../../../_helpers/bookComments';
import { errorResponse, successResponse } from '../../../_helpers/response';

import type { CommentRow, ProfileRow } from '../../../_helpers/bookComments';

type Params = {
  params: Promise<{ id: string }>;
};

const COMMENT_COLUMNS =
  'id, user_id, parent_comment_id, content, created_at, updated_at';

const fetchProfiles = async (
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  rows: CommentRow[]
): Promise<ProfileRow[]> => {
  const userIds = [
    ...new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)),
  ];
  if (userIds.length === 0) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, nickname, username, photo_url')
    .in('id', userIds);

  return (data ?? []) as ProfileRow[];
};

/**
 * GET /api/stories/[id]/comments
 * 책 이야기 글의 댓글 — 비회원도 읽는다
 *
 * 학습 포인트:
 * - 책 댓글(book_comments)과 테이블은 따로지만(HJ, 2026-11-27) 모양은 같다.
 *   그래서 트리 만들기·에러 분류·길이 제한은 bookComments 헬퍼를 그대로 쓴다.
 * - "공개 글의, 가려지지 않은 댓글만"은 RLS 가 거른다. 앱에서 다시 확인하지 않는다.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('story_comments')
      .select(COMMENT_COLUMNS)
      .eq('story_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const rows = (data ?? []) as CommentRow[];
    const profiles = await fetchProfiles(supabase, rows);
    return successResponse(buildCommentTree(rows, profiles));
  } catch (error) {
    console.error('책 이야기 댓글 조회 에러:', error);
    return errorResponse('댓글 조회에 실패했습니다.');
  }
}

/**
 * POST /api/stories/[id]/comments
 * 책 이야기 글에 댓글 작성(로그인 필요)
 *
 * 알림은 아직 보내지 않는다. 알림 화면·푸시가 책(book·global_book)으로 가는 길만 알아서,
 * 글(/blog/{slug})로 가는 길을 먼저 만들어야 한다 — 다음 단계로 남겨 둔다.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = await request.json().catch(() => null);
    const content: unknown = body?.content;
    const parentCommentId: unknown = body?.parentCommentId;

    if (typeof content !== 'string' || content.trim().length === 0) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }
    if (content.trim().length > COMMENT_MAX_LENGTH) {
      return errorResponse(
        `댓글은 ${COMMENT_MAX_LENGTH}자까지 쓸 수 있어요.`,
        400
      );
    }

    const { data: comment, error } = await supabase
      .from('story_comments')
      .insert({
        story_id: id,
        user_id: user!.id,
        parent_comment_id:
          typeof parentCommentId === 'string' && parentCommentId
            ? parentCommentId
            : null,
        content: content.trim(),
      })
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const row = comment as CommentRow;
    const profiles = await fetchProfiles(supabase, [row]);
    const [node] = buildCommentTree([row], profiles);

    return successResponse(node, 201);
  } catch (error) {
    console.error('책 이야기 댓글 작성 에러:', error);
    return errorResponse('댓글 작성에 실패했습니다.');
  }
}
