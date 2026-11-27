import { renderOg } from '@/shared/lib/og/render';
import { BrandStage } from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

// 서비스 소개(/about) 공유 그림 (2026-11-27)
//
// 자기 그림이 없으면 루트(홈) 카드를 물려받아, 링크 미리보기가 홈과 똑같아 보였다.
// 홈과 같은 틀(파란 무대 + 흰 띠)에 이 페이지의 문구만 바꿔 단다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '서비스 소개 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const Image = () =>
  renderOg(
    <BrandStage
      slogan={['읽은 책이 쌓여', '책장이 됩니다']}
      cta='서비스 소개 보기'
    />
  );

export default Image;
