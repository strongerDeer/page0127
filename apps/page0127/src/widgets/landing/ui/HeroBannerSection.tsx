import { HeroBanner } from '@/widgets/landing/ui/HeroBanner';

import type { HeroBannerData } from '@/widgets/landing/api/getHeroBanner';

/**
 * 히어로 배너
 *
 * 어드민(hero_slides)에 켜 둔 슬라이드가 있을 때만 나온다. 없으면 자리째 비운다.
 * 예전엔 코드 폴백 슬라이드 다섯 장이 늘 돌았는데, 모두 같은 책 표지 구도라
 * 넘겨도 같은 그림이었다(2026-10-25 HJ: "책 형태가 너무 똑같아서 별로").
 * 알릴 것이 있을 때 어드민에서 등록하면 홈 맨 위에 선다.
 *
 * 데이터는 page 가 셸 전에 읽어 넘긴다(widgets/landing/api/getHeroBanner.ts) —
 * 캐시 조회를 Suspense 안에서 읽으면 배경 갱신이 끊긴다.
 * 표지를 못 가져와도 배너는 카피만으로 렌더된다(랜딩이 죽지 않는다).
 */
export const HeroBannerSection = ({
  banner,
}: {
  banner: HeroBannerData | null;
}) => {
  if (!banner) return null;
  return <HeroBanner slides={banner.slides} covers={banner.covers} />;
};
