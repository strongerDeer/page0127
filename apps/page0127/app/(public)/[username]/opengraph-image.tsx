import { renderOg } from '@/shared/lib/og/render';
import { BrandStage, CoverRow, StageCard } from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

import { getPublicShelfSummary } from '@/entities/book/api/getPublicShelfSummary';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';

// 공개 책장의 동적 OG 이미지 — 파란 무대에 최근 표지를 세우고 흰 띠에 한 줄을 둔다.
//
// 소개 페이지(/about)의 '공개 서재' 카드와 같은 구도다. 소개 페이지에서 "링크로
// 공유하면 이렇게 보여요"라고 약속한 모습과 실제 미리보기를 맞췄다(2026-10-06).
// 이름은 이미지에 쓰지 않는다 — 카톡이 바로 아래 페이지 제목("…님의 책장")으로 보여 준다.
//
// runtime 을 지정하지 않는다 = Node.js 런타임.
// 'edge' 로 두면 next/og(satori + resvg wasm, ~2.4MB)가 Edge Function 번들에 통째로
// 실려 Vercel Hobby 의 1MB 한도를 넘긴다. 빌드는 통과하고 "Deploying outputs..."
// 단계에서 배포만 실패하므로 빌드 로그로는 원인이 안 보인다(app/opengraph-image.tsx 참조).
//
// 폰트는 shared/lib/og/render.tsx 가 붙인다(Pretendard). 폰트를 못 받으면 글자가
// 사라질 수 있어, 카드의 뼈대는 글자가 아니라 표지·색면이 지도록 짰다.

export const alt = '공개 책장 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ username: string }>;
};

const Image = async ({ params }: Props) => {
  const { username } = await params;

  // 조회가 실패해도 카드는 나가야 한다 — 미리보기가 없는 것보다 브랜드 카드라도 나은 편이다.
  // (프로필이 없는 URL 로 크롤러가 들어오는 경우도 여기로 떨어진다)
  let found = false;
  let totalBooks = 0;
  let covers: string[] = [];

  try {
    const profile = await getPublicProfileByUsername(username);

    if (profile) {
      found = true;
      const summary = await getPublicShelfSummary(profile.id);
      totalBooks = summary.totalBooks;
      covers = summary.covers;
    }
  } catch (error) {
    console.error('책장 OG 조회 실패:', error);
  }

  // 표지가 한 장도 없으면 브랜드 카드 — 빈 판형만 늘어선 무대는 깨진 이미지로 보인다.
  // 책은 있는데 표지가 없는 경우도 같다(수기 등록 책만 있는 책장).
  if (covers.length === 0) {
    return renderOg(
      <BrandStage cta={found ? '막 시작한 책장 구경하기' : '내 책장 만들기'} />
    );
  }

  return renderOg(
    // 권수는 "눌러 볼 이유"가 되는 숫자라 한 줄에 넣는다 — 이름은 아래 제목이 말한다
    <StageCard cta={`${totalBooks}권이 꽂힌 책장 구경하기`}>
      <CoverRow covers={covers} />
    </StageCard>
  );
};

export default Image;
