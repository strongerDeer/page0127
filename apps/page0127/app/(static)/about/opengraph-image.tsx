import { renderOg } from '@/shared/lib/og/render';
import { BrandStage } from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

// 소개(/about) 링크 미리보기 (2026-11-27)
//
// 홈 카드와 같은 그림(선반 위 책장)에 슬로건·한 줄만 바꾼다(HJ 2026-11-27 "디자인 같게, 텍스트만 다르게").
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '서비스 소개 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const Image = () =>
  renderOg(
    <BrandStage
      cta='서비스 소개 보기'
      slogan={['읽은 책이 쌓여', '책장이 됩니다']}
    />
  );

export default Image;
