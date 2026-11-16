import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { CompatibilityStoryCard } from '@/shared/lib/og/CompatibilityStoryCard';
import { PRIVATE_IMAGE_CACHE_CONTROL, renderOg } from '@/shared/lib/og/render';
import { STORY_SIZE } from '@/shared/lib/og/theme';

import { getCompatibilityTypeByScore } from '@/entities/compatibility/model/compatibilityTypes';
import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';
import { PROFILE_PUBLIC_COLUMNS } from '@/entities/profile/api/profileColumns';
import { toDisplayName } from '@/entities/profile/model/displayName';

import type { CompatibilityAnalysis } from '@/entities/compatibility/types';

// 독서 케미 스토리 이미지 (1080×1920) — 케미 결과 화면의 공유 버튼이 받아 간다.
//
// 케미는 "나"와 상대의 쌍이라 부르는 사람(쿠키)에 따라 그림이 다르다. compatibility_analyses
// RLS 도 두 사람에게만 열려 있다. 그래서 CDN 캐시에 올리지 않는다(PRIVATE_IMAGE_CACHE_CONTROL).
// 왼쪽이 나, 오른쪽이 상대 — 공유하는 사람이 주인공이다.
//
// runtime 을 지정하지 않는다 = Node.js 런타임 (story-image 와 같은 이유).

type Context = { params: Promise<{ username: string }> };

const privateResponse = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { 'Cache-Control': PRIVATE_IMAGE_CACHE_CONTROL },
  });

export const GET = async (_request: Request, { params }: Context) => {
  const { username } = await params;

  try {
    const [user, target] = await Promise.all([
      getCurrentUser(),
      getProfileByUsername(username),
    ]);
    if (!user) return privateResponse('로그인 필요', 401);
    if (!target || target.id === user.id) {
      return privateResponse('없는 케미', 404);
    }

    // 정렬된 쌍 — DB 제약(user_id_1 < user_id_2)·케미 화면(page.tsx)과 같은 기준
    const [userId1, userId2] =
      user.id < target.id ? [user.id, target.id] : [target.id, user.id];

    const supabase = await createClient();
    const [{ data: analysis }, { data: me }] = await Promise.all([
      supabase
        .from('compatibility_analyses')
        .select('compatibility_score, similarity_analysis')
        .eq('user_id_1', userId1)
        .eq('user_id_2', userId2)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<
          Pick<
            CompatibilityAnalysis,
            'compatibility_score' | 'similarity_analysis'
          >
        >(),
      supabase
        .from('profiles')
        .select(PROFILE_PUBLIC_COLUMNS)
        .eq('id', user.id)
        .maybeSingle(),
    ]);
    // 아직 분석하지 않았으면 그릴 것이 없다 — 화면도 결과가 있을 때만 공유 버튼을 그린다
    if (!analysis || !me) return privateResponse('없는 케미', 404);

    // 타입 이름·설명은 점수 구간에서 다시 고른다 — 화면(CompatibilityView)과 같은 출처
    const band = getCompatibilityTypeByScore(analysis.compatibility_score);

    return renderOg(
      <CompatibilityStoryCard
        me={{ name: toDisplayName(me), photoUrl: me.photo_url }}
        target={{ name: toDisplayName(target), photoUrl: target.photo_url }}
        score={analysis.compatibility_score}
        typeName={band.name}
        tagline={band.tagline}
        interests={analysis.similarity_analysis?.common_interests ?? []}
      />,
      STORY_SIZE,
      PRIVATE_IMAGE_CACHE_CONTROL
    );
  } catch (error) {
    console.error('케미 스토리 이미지 조회 실패:', error);
    return privateResponse('조회 실패', 500);
  }
};
