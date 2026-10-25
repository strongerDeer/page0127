import { renderOg } from '@/shared/lib/og/render';
import { StoryCard } from '@/shared/lib/og/StoryCard';
import { STORY_SIZE } from '@/shared/lib/og/theme';

import { getReaderShareData } from '@/widgets/public-library/api/getReaderShareData';
import { resolveStoryShelf } from '@/widgets/public-library/api/resolveStoryShelf';
import { toGoalStoryProps } from '@/widgets/public-library/model/goalStory';

// 목표 달성 스토리 이미지 (1080×1920) — 서재 '올해 요약'의 "달성 공유하기"가 받아 간다.
// 서재 스토리(story-image)와 같은 데이터·같은 틀, 주인공만 목표다.
//
// runtime 을 지정하지 않는다 = Node.js 런타임 (opengraph-image.tsx 와 같은 이유 —
// next/og 번들이 Edge 1MB 한도를 넘는다). 캐시 헤더는 renderOg 가 붙인다(1시간).

type Context = { params: Promise<{ username: string }> };

export const GET = async (_request: Request, { params }: Context) => {
  const { username } = await params;

  let data: Awaited<ReturnType<typeof getReaderShareData>> = null;
  try {
    data = await getReaderShareData(username);
  } catch (error) {
    console.error('목표 달성 스토리 이미지 조회 실패:', error);
    return new Response('조회 실패', { status: 500 });
  }
  if (!data) return new Response('없는 서재', { status: 404 });

  // 아직 못 채운 목표는 그리지 않는다 — 주소만 알면 누구나 부를 수 있어 "달성"을 지어낼 수 없게
  const props = toGoalStoryProps(
    data,
    username,
    process.env.NEXT_PUBLIC_SITE_URL
  );
  if (!props) return new Response('달성한 목표 없음', { status: 404 });

  // 책등을 미리 받아 실제 폭으로 단을 나눈다(story-image 와 같은 이유)
  const shelf = props.shelf && (await resolveStoryShelf(props.shelf));

  return renderOg(<StoryCard {...props} shelf={shelf} />, STORY_SIZE);
};
