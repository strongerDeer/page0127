import { TrackOnMount } from '@/shared/lib/analytics/TrackOnMount';

import { getLeaderLifeBooks } from '../api/getLeaderLifeBooks';
import { getShelfPicks } from '../api/getShelfPicks';
import { LifeBookHero } from './LifeBookHero';
import { ShelfPreview } from './ShelfPreview';

import type { HeroVariant } from '@/shared/lib/experiment/heroVariant';

type ShelfPreviewSectionProps = {
  /** 홈 히어로 A/B 그룹 — 스위치가 꺼져 있으면 언제나 'a' (page 가 정한다) */
  variant: HeroVariant;
};

/**
 * 비로그인 홈 히어로. A 는 10권에서 여러 권 고르기, B 는 인생책 한 권 찾기.
 * 책 목록은 서버에서 읽고(캐시), 고르기·찾기는 클라이언트가 한다.
 */
export const ShelfPreviewSection = async ({
  variant,
}: ShelfPreviewSectionProps) => (
  <>
    {/* 맛보기 깔때기의 분모 — 히어로를 본 사람 수. 그룹은 GA 사용자 속성으로 붙는다 */}
    <TrackOnMount event='shelf_preview_view' />
    {variant === 'b' ? (
      <LifeBookHero leaders={await getLeaderLifeBooks()} />
    ) : (
      <ShelfPreview picks={await getShelfPicks()} />
    )}
  </>
);
