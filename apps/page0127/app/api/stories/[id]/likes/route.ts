import { NextRequest } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/** 좋아요 상태 — 비회원은 isLiked 가 항상 false (화면 쪽 타입: entities/story StoryLikeState) */
type StoryLikeState = { count: number; isLiked: boolean };

/** 같은 사람이 두 번 누른 경우(기본 키 충돌) — 이미 눌린 상태라 성공으로 본다 */
const UNIQUE_VIOLATION = '23505';

const readState = async (
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  storyId: string,
  userId: string | null
): Promise<StoryLikeState> => {
  const [{ count }, mine] = await Promise.all([
    supabase
      .from('story_likes')
      .select('story_id', { count: 'exact', head: true })
      .eq('story_id', storyId),
    userId
      ? supabase
          .from('story_likes')
          .select('story_id')
          .eq('story_id', storyId)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { count: count ?? 0, isLiked: !!mine.data };
};

/**
 * GET /api/stories/[id]/likes
 * 좋아요 수 + 내가 눌렀는지 — 비회원도 수는 본다
 *
 * 학습 포인트:
 * - 책 이야기 페이지는 미리 만들어 두는(ISR) 페이지라 서버 렌더에서 로그인을 읽으면 안 된다.
 *   그래서 숫자처럼 사람마다 다른 값은 브라우저가 이 API 로 따로 받는다.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return successResponse(await readState(supabase, id, user?.id ?? null));
  } catch (error) {
    console.error('책 이야기 좋아요 조회 에러:', error);
    return errorResponse('좋아요를 불러오지 못했어요.');
  }
}

/** POST /api/stories/[id]/likes — 누르기(이미 눌렀으면 그대로) */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { error } = await supabase
      .from('story_likes')
      .insert({ user_id: user!.id, story_id: id });

    if (error && error.code !== UNIQUE_VIOLATION) {
      if (error.code === '42501') {
        return errorResponse('좋아요를 누를 수 없는 글이에요.', 403);
      }
      return errorResponse(error.message);
    }
    return successResponse(await readState(supabase, id, user!.id));
  } catch (error) {
    console.error('책 이야기 좋아요 에러:', error);
    return errorResponse('좋아요에 실패했습니다.');
  }
}

/** DELETE /api/stories/[id]/likes — 취소 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { error } = await supabase
      .from('story_likes')
      .delete()
      .eq('story_id', id)
      .eq('user_id', user!.id);

    if (error) return errorResponse(error.message);
    return successResponse(await readState(supabase, id, user!.id));
  } catch (error) {
    console.error('책 이야기 좋아요 취소 에러:', error);
    return errorResponse('좋아요 취소에 실패했습니다.');
  }
}
