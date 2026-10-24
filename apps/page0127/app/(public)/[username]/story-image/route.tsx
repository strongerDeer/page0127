import { renderOg } from '@/shared/lib/og/render';
import { StoryCard } from '@/shared/lib/og/StoryCard';
import { STORY_SIZE } from '@/shared/lib/og/theme';

import { getReaderShareData } from '@/widgets/public-library/api/getReaderShareData';
import { toStoryCardProps } from '@/widgets/public-library/model/storyCard';

// 서재 스토리 이미지 (1080×1920) — 서재 공유 시트의 "이미지 공유하기"가 받아 간다.
// 공유 카드(opengraph-image)와 같은 데이터·같은 명함 규칙, 크기만 다르다.
//
// runtime 을 지정하지 않는다 = Node.js 런타임 (opengraph-image.tsx 와 같은 이유 —
// next/og 번들이 Edge 1MB 한도를 넘는다). 캐시 헤더는 renderOg 가 붙인다(1시간).

type Context = { params: Promise<{ username: string }> };

export const GET = async (_request: Request, { params }: Context) => {
  const { username } = await params;

  // OG 와 달리 크롤러가 아니라 서재 화면의 버튼이 부른다 — 없는 서재면 그릴 것이 없다
  let data: Awaited<ReturnType<typeof getReaderShareData>> = null;
  try {
    data = await getReaderShareData(username);
  } catch (error) {
    console.error('서재 스토리 이미지 조회 실패:', error);
    return new Response('조회 실패', { status: 500 });
  }
  if (!data) return new Response('없는 서재', { status: 404 });

  return renderOg(
    <StoryCard
      {...toStoryCardProps(data, username, process.env.NEXT_PUBLIC_SITE_URL)}
    />,
    STORY_SIZE
  );
};
