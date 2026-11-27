import {
  CHEER_SERIF_FAMILY,
  CheerStoryCard,
} from '@/shared/lib/og/CheerStoryCard';
import { loadGoogleFont } from '@/shared/lib/og/googleFont';
import { PRIVATE_IMAGE_CACHE_CONTROL, renderOg } from '@/shared/lib/og/render';
import { STORY_SIZE } from '@/shared/lib/og/theme';

import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';
import { CHEER_YEAR, toCheerLine, toCheerSource } from '@/entities/year-cheer';
import { getYearCheer } from '@/entities/year-cheer/server';

import { getCheerBookCount } from '@/features/year-cheer/server';

// 연말 응원 카드 스토리 이미지 (1080×1920) — 응원 카드의 "인스타 스토리로 공유"가 받아 간다.
//
// 카드 화면과 같은 공개 값(받은 문장·공개 완독 권수)으로 그린다. 친구가 같은 주소를 열어도 같은 그림이라
// 공개 캐시(1시간)에 올려도 된다. 아직 선물을 안 열었으면 404 — 이때는 캐시하지 않는다(열자마자 다시 받아야 한다).
// runtime 을 지정하지 않는다 = Node.js 런타임 (story-image 와 같은 이유 — next/og 번들이 Edge 한도를 넘는다).

type Context = { params: Promise<{ username: string }> };

const notFound = () =>
  new Response('아직 열지 않은 선물', {
    status: 404,
    headers: { 'Cache-Control': PRIVATE_IMAGE_CACHE_CONTROL },
  });

export const GET = async (_request: Request, { params }: Context) => {
  const { username } = await params;

  try {
    const profile = await getPublicProfileByUsername(username);
    if (!profile) return notFound();

    const [cheer, books] = await Promise.all([
      getYearCheer(profile.id, CHEER_YEAR),
      getCheerBookCount(profile.id, CHEER_YEAR),
    ]);
    if (!cheer) return notFound();

    const { sentence } = cheer;
    // 명조는 문장 줄에만 쓴다 — 그 글자만 받는다
    const serif = await loadGoogleFont(
      CHEER_SERIF_FAMILY,
      700,
      sentence.lines.join('')
    );

    return renderOg(
      <CheerStoryCard
        year={CHEER_YEAR}
        name={toDisplayName(profile)}
        firstLine={toCheerLine(books)}
        lines={sentence.lines}
        source={toCheerSource(sentence)}
        serif={serif !== null}
      />,
      STORY_SIZE,
      undefined,
      serif ? [serif] : []
    );
  } catch (error) {
    console.error('응원 카드 이미지 조회 실패:', error);
    return new Response('조회 실패', {
      status: 500,
      headers: { 'Cache-Control': PRIVATE_IMAGE_CACHE_CONTROL },
    });
  }
};
