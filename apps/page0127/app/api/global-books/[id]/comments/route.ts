import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import {
  buildCommentTree,
  classifyBookCommentError,
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
 * GET /api/global-books/[id]/comments
 * 전역 책 스레드 — 순수 댓글만
 *
 * 학습 포인트:
 * - 활동 병합이 없다. 전역 책은 여러 사람이 담는 "책 그 자체"라 특정 사용자의
 *   상태 변화(담음·완독)가 존재하지 않는다.
 * - RLS가 전역 책 댓글을 누구나 볼 수 있게 하므로(20260725000003) 권한 분기가 없다.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('book_comments')
      .select(COMMENT_COLUMNS)
      .eq('global_book_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const rows = (data ?? []) as CommentRow[];
    const profiles = await fetchProfiles(supabase, rows);

    return successResponse(buildCommentTree(rows, profiles));
  } catch (error) {
    console.error('전역 책 댓글 조회 에러:', error);
    return errorResponse('댓글 조회에 실패했습니다.');
  }
}

/**
 * POST /api/global-books/[id]/comments
 * 전역 책 스레드에 댓글 작성
 *
 * 학습 포인트:
 * - 개인 책과 달리 **소유자가 없다.** 그래서 알림은 대댓글일 때 부모 댓글
 *   작성자에게만 간다. 루트 댓글은 알릴 상대가 없다.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { content, parentCommentId } = await request.json();

    if (!content?.trim()) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    const { data: comment, error } = await supabase
      .from('book_comments')
      .insert({
        global_book_id: id,
        user_id: user!.id,
        parent_comment_id: parentCommentId ?? null,
        content: content.trim(),
      })
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const profiles = await fetchProfiles(supabase, [comment as CommentRow]);
    const [node] = buildCommentTree([comment as CommentRow], profiles);

    // 대댓글이면 부모 댓글 작성자에게 알린다(본인 제외). 전역 책은 소유자가 없다.
    if (parentCommentId) {
      const { data: parent } = await supabase
        .from('book_comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();

      if (parent?.user_id && parent.user_id !== user!.id) {
        await supabase.from('notifications').insert({
          user_id: parent.user_id,
          type: 'comment',
          actor_id: user!.id,
          target_id: id,
          target_type: 'global_book',
        });
      }
    }

    return successResponse(node, 201);
  } catch (error) {
    console.error('전역 책 댓글 작성 에러:', error);
    return errorResponse('댓글 작성에 실패했습니다.');
  }
}
