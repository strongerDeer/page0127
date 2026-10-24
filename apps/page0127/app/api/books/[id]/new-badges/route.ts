import { NextRequest } from 'next/server';

import { getProfile } from '@/entities/profile/api/getProfile';
import { getPublicTasteHistory } from '@/entities/taste-analysis/api/getPublicTasteHistory';

import { computeBadges } from '@/features/badge';
import { newlyEarnedBadges } from '@/features/badge/model/newlyEarned';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse, successResponse } from '@/app/api/_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/books/[id]/new-badges
 * 방금 완독으로 저장한 책 덕분에 새로 받은 뱃지 (축하 토스트용)
 *
 * 뱃지는 저장하지 않고 공개 책에서 계산하므로, "이 책이 없던 때"와 "지금"을 계산해 비교한다.
 * 완독으로 바뀐 순간에만 부른다 — 그 전에는 이 책이 어떤 뱃지에도 쓰이지 않았으니
 * 이 책을 뺀 목록이 곧 저장 전 상태다. 서재와 같은 입력(공개 책)을 써서
 * 비공개 책은 축하하지 않는다 — 서재에서도 보이지 않는 뱃지다.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { id } = await params;
    const supabase = await getSupabaseClient();

    const [profile, { data: books, error }, tasteHistory] = await Promise.all([
      getProfile(user!.id),
      supabase
        .from('books')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_public', true),
      getPublicTasteHistory(user!.id),
    ]);

    if (error) return errorResponse(error.message);
    if (!profile) return successResponse({ username: null, badges: [] });

    const input = {
      readingGoal: profile.reading_goal ?? null,
      // 이력은 최신순이라 마지막 것이 첫 분석이다
      firstTasteAnalysisAt: tasteHistory.at(-1)?.created_at ?? null,
    };
    const after = computeBadges({ ...input, books: books ?? [] });
    const before = computeBadges({
      ...input,
      books: (books ?? []).filter((book) => book.id !== id),
    });

    return successResponse({
      username: profile.username,
      badges: newlyEarnedBadges(before, after),
    });
  } catch (error) {
    console.error('새 뱃지 계산 예외:', error);
    return errorResponse('새 뱃지를 계산하지 못했습니다.');
  }
}
