import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { PRIVATE_IMAGE_CACHE_CONTROL, renderOg } from '@/shared/lib/og/render';
import { TasteStoryCard } from '@/shared/lib/og/TasteStoryCard';
import { STORY_SIZE } from '@/shared/lib/og/theme';

import { getProfile } from '@/entities/profile/api/getProfile';
import { toDisplayName } from '@/entities/profile/model/displayName';
import { getPersonalityColor } from '@/entities/taste-analysis/model/personalityTypes';
import {
  firstSentence,
  pickShareableEvidence,
} from '@/entities/taste-analysis/model/tasteStory';

import { toStoryAddress } from '@/widgets/public-library/model/storyCard';

import type { PreferenceProfile } from '@/entities/taste-analysis/types';

// AI 취향 분석 스토리 이미지 (1080×1920) — 분석 결과 화면 "독서 성향" 카드의 공유 버튼이 받아 간다.
//
// 분석(taste_analyses)은 RLS 로 본인만 읽는다 → 이 이미지도 로그인한 주인만 그린다.
// 주소를 남이 알아도 404, CDN 캐시에도 올리지 않는다(PRIVATE_IMAGE_CACHE_CONTROL — 문장 카드·케미와 같다).
//
// ⚠️ 근거 책은 "지금 공개인 책"만 그린다. 분석은 비공개 책까지 넣어 돌리고, 주인이 부르면 RLS 가
// 비공개 책도 열어 준다. 공유 이미지는 남이 보는 그림이라 여기서 한 번 더 거른다(pickShareableEvidence).
//
// runtime 을 지정하지 않는다 = Node.js 런타임 (next/og 번들이 Edge 한도를 넘는다 — theme.ts).

type Context = { params: Promise<{ id: string }> };

const privateResponse = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { 'Cache-Control': PRIVATE_IMAGE_CACHE_CONTROL },
  });

export const GET = async (_request: Request, { params }: Context) => {
  const { id } = await params;

  try {
    const user = await getCurrentUser();
    if (!user) return privateResponse('로그인 필요', 401);

    const supabase = await createClient();
    const [profile, { data: analysis }] = await Promise.all([
      getProfile(user.id),
      // user_id 까지 맞춘다 — RLS 와 별개의 방어(상세 페이지 [id]/page.tsx 와 같다)
      supabase
        .from('taste_analyses')
        .select('personality_type, personality_description, preference_profile')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle<{
          personality_type: string;
          personality_description: string;
          preference_profile: PreferenceProfile;
        }>(),
    ]);
    if (!profile?.username || !analysis) {
      return privateResponse('없는 분석', 404);
    }

    // 근거 없는 옛 분석(2026-10-25 이전)은 빈 배열 → 설명만 그린다
    const evidence = analysis.preference_profile?.evidence ?? [];
    const bookIds = evidence.map((item) => item.book_id);
    const { data: publicBooks } =
      bookIds.length > 0
        ? await supabase
            .from('books')
            .select('id')
            .in('id', bookIds)
            .eq('user_id', user.id)
            .eq('is_public', true)
        : { data: [] };
    const shareable = pickShareableEvidence(
      evidence,
      new Set((publicBooks ?? []).map((row) => row.id as string))
    );

    return renderOg(
      <TasteStoryCard
        photoUrl={profile.photo_url}
        name={toDisplayName(profile)}
        address={toStoryAddress(
          process.env.NEXT_PUBLIC_SITE_URL,
          profile.username
        )}
        personalityType={analysis.personality_type}
        accent={getPersonalityColor(analysis.personality_type)}
        description={firstSentence(analysis.personality_description)}
        evidence={shareable.map((item) => ({
          // 부제(' - ' 뒤)는 뗀다 — 책·문장 스토리 이미지와 같은 규칙
          title: item.title.split(' - ')[0],
          cover: item.cover_image,
          topics: item.topics,
        }))}
      />,
      STORY_SIZE,
      PRIVATE_IMAGE_CACHE_CONTROL
    );
  } catch (error) {
    console.error('취향 분석 스토리 이미지 조회 실패:', error);
    return privateResponse('조회 실패', 500);
  }
};
