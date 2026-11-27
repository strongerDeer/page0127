import { renderOg } from '@/shared/lib/og/render';
import { BrandStage } from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

import { CHEER_YEAR } from '@/entities/year-cheer';

// 연말 응원 카드(/아이디/cheer) 링크 미리보기 그림 (2026-11-27)
//
// 자기 그림이 없으면 위 폴더의 공개 책장 그림(표지 줄)을 물려받아, 친구가 카톡으로 받은
// 선물 링크가 그냥 책장 링크처럼 보였다. 홈과 같은 틀(파란 무대 + 흰 띠)에 선물 문구만 단다.
// 문장은 그림에 넣지 않는다 — 친구가 눌러서 보는 재미를 남긴다.
// 이름도 넣지 않는다 — 카톡이 바로 아래 페이지 제목("…님에게 온 2026 응원")으로 보여 준다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = `${CHEER_YEAR} 연말 응원 | page0127.`;
export const size = OG_SIZE;
export const contentType = 'image/png';

const Image = () =>
  renderOg(
    <BrandStage
      slogan={['한 해 수고한', '당신에게 온 선물']}
      cta='선물 열어 보기'
    />
  );

export default Image;
