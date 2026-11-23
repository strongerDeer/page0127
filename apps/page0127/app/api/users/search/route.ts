import { NextRequest } from 'next/server';

import { quotePostgrestValue } from '@/shared/lib/postgrestFilter';

import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import {
  getFollowCountMap,
  pickFollowCounts,
} from '../../_helpers/followCounts';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/users/search?q=검색어
 * 사용자 검색 (닉네임, 사용자명 기반)
 *
 * 학습 포인트:
 * - URL 쿼리 파라미터 처리 (searchParams)
 * - ILIKE를 사용한 대소문자 구분 없는 부분 일치 검색
 * - 현재 사용자와의 팔로우 관계 포함
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return errorResponse('검색어를 입력해주세요.', 400);
    }

    // 현재 로그인한 사용자 (팔로우 여부 확인용)
    const { user } = await getCurrentUser();
    const currentUserId = user?.id;

    // 검색어로 프로필 검색 (닉네임 또는 사용자명)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, nickname, username, bio, photo_url')
      // 리뷰어용 체험 계정은 사람 찾기에 나오지 않는다(shared/lib/demo/demoAccount)
      .eq('is_demo', false)
      // 감싸지 않으면 q 에 쉼표를 넣어 다른 컬럼 조건을 덧붙일 수 있다(postgrestFilter.ts)
      .or(
        `nickname.ilike.${quotePostgrestValue(`%${query}%`)},username.ilike.${quotePostgrestValue(`%${query}%`)}`
      )
      .limit(20);

    if (process.env.NODE_ENV === 'development') {
      console.warn('검색 쿼리:', query);
      console.warn('검색 결과:', profiles);
    }
    if (error) {
      console.error('검색 에러:', error);
      return errorResponse(error.message);
    }

    if (!profiles || profiles.length === 0) {
      return successResponse([]);
    }

    // 현재 사용자가 로그인한 경우, 각 프로필에 대한 팔로우 여부 확인
    let followMap = new Map<string, boolean>();
    if (currentUserId) {
      const profileIds = profiles.map((p) => p.id);
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', profileIds);

      followMap = new Map(follows?.map((f) => [f.following_id, true]) || []);
    }

    // 팔로워/팔로잉 수 — user_follow_stats 뷰에서 일괄 조회.
    // follows 를 직접 세면 RLS(내가 낀 행만, 2026-11-23) 때문에 남의 숫자가 0 으로 나온다
    const countMap = await getFollowCountMap(
      supabase,
      profiles.map((p) => p.id)
    );

    // 결과 조합
    const results = profiles.map((profile) => ({
      id: profile.id,
      nickname: profile.nickname,
      username: profile.username,
      bio: profile.bio,
      photo_url: profile.photo_url,
      ...pickFollowCounts(countMap, profile.id),
      is_following: followMap.get(profile.id) || false,
    }));

    return successResponse(results);
  } catch {
    return errorResponse('사용자 검색에 실패했습니다.');
  }
}
