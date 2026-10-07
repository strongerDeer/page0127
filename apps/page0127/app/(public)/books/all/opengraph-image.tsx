import { renderOg } from '@/shared/lib/og/render';
import { BrandStage, CoverRow, StageCard } from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

import { COVER_LIMIT } from '@/entities/book/api/getPublicShelfSummary';
import { getRecentGlobalCovers } from '@/entities/book/api/getRecentGlobalCovers';

// 전체 도서 카탈로그의 OG 이미지 — 최근 들어온 책 표지 5장.
//
// 이 페이지는 metadata.openGraph 를 직접 써서 루트 OG 이미지를 물려받지 못했고,
// 그동안 **이미지 없는 미리보기**가 나갔다(2026-10-07 점검). 파일 규칙으로 두면
// Next 가 og:image 를 알아서 붙인다.
//
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '전체 도서 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const CTA = '기록된 책 둘러보기';

const Image = async () => {
  const covers = await getRecentGlobalCovers(COVER_LIMIT);

  if (covers.length === 0) {
    return renderOg(<BrandStage cta={CTA} />);
  }

  return renderOg(
    <StageCard cta={CTA}>
      <CoverRow covers={covers} />
    </StageCard>
  );
};

export default Image;
