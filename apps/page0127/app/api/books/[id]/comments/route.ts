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
    ...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
  ];
  if (userIds.length === 0) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, nickname, username, photo_url')
    .in('id', userIds);

  return data ?? [];
};

/**
 * GET /api/books/[id]/comments
 * 개인 서재 책 스레드의 댓글 목록
 *
 * 학습 포인트:
 * - 권한 판단을 앱에서 하지 않는다. RLS가 "볼 수 있는 책의 댓글"만 돌려주므로
 *   비공개 책이면 빈 배열이 온다.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { data: rows, error } = await supabase
      .from('book_comments')
      .select(COMMENT_COLUMNS)
      .eq('book_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }
    if (!rows || rows.length === 0) return successResponse([]);

    const profiles = await fetchProfiles(supabase, rows);
    return successResponse(buildCommentTree(rows, profiles));
  } catch (error) {
    console.error('책 댓글 조회 에러:', error);
    return errorResponse('댓글 조회에 실패했습니다.');
  }
}

/**
 * POST /api/books/[id]/comments
 * 개인 서재 책 스레드에 댓글 작성
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = await request.json();
    const { content, parentCommentId } = body;

    if (!content || content.trim().length === 0) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    const { data: comment, error } = await supabase
      .from('book_comments')
      .insert({
        book_id: id,
        user_id: user!.id,
        parent_comment_id: parentCommentId || null,
        content: content.trim(),
      })
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const profiles = await fetchProfiles(supabase, [comment]);
    const [node] = buildCommentTree([comment], profiles);

    // 알림 — 책 소유자에게 (본인 책에 단 경우 제외)
    const { data: book } = await supabase
      .from('books')
      .select('user_id')
      .eq('id', id)
      .single();

    if (book && book.user_id !== user!.id) {
      await supabase.from('notifications').insert({
        user_id: book.user_id,
        type: 'comment',
        actor_id: user!.id,
        target_id: id,
        target_type: 'book',
      });
    }

    // 대댓글이면 부모 댓글 작성자에게도 (중복·자기 자신 제외)
    if (parentCommentId) {
      const { data: parent } = await supabase
        .from('book_comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();

      if (
        parent?.user_id &&
        parent.user_id !== user!.id &&
        parent.user_id !== book?.user_id
      ) {
        await supabase.from('notifications').insert({
          user_id: parent.user_id,
          type: 'comment',
          actor_id: user!.id,
          target_id: id,
          target_type: 'book',
        });
      }
    }

    return successResponse(node, 201);
  } catch (error) {
    console.error('책 댓글 작성 에러:', error);
    return errorResponse('댓글 작성에 실패했습니다.');
  }
}
