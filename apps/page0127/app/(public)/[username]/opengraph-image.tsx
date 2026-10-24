import { renderOg } from '@/shared/lib/og/render';
import { BrandStage, CoverRow, StageCard } from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE, truncate } from '@/shared/lib/og/theme';

import { getReaderShareData } from '@/widgets/public-library/api/getReaderShareData';

import type { ReaderCard } from '@/widgets/public-library/model/readerCard';

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

/**
 * 성향 이름 최대 폭(한글 글자 수 기준). 카탈로그에서 가장 긴 이름이 15자 남짓이고,
 * 띠 폭(1200 − 여백 − 워드마크)에 38px 로 들어가는 한계다. AI 가 카탈로그 밖의 긴 이름을 내도 넘치지 않게 자른다.
 */
const IDENTITY_MAX_WIDTH = 17;

/**
 * 흰 띠의 독서 명함 두 줄 — 위: 성향 이름(색 막대), 아래: 숫자 한 줄 · 구경하기.
 * 서재 상단 명함과 같은 순서다. 링크를 받은 사람이 누르기 전에 "어떤 독자인지"부터 본다.
 */
const ReaderBand = ({
  identity,
  stat,
}: {
  identity: NonNullable<ReaderCard['identity']>;
  stat: string | null;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          width: 8,
          height: 34,
          marginRight: 16,
          borderRadius: 4,
          background: identity.color,
        }}
      />
      {truncate(identity.name, IDENTITY_MAX_WIDTH)}
    </div>
    <div
      style={{
        display: 'flex',
        marginTop: 6,
        marginLeft: 24,
        fontSize: 26,
        fontWeight: 500,
        color: OG_COLORS.inkSoft,
      }}
    >
      {stat ? `${stat} · 책장 구경하기` : '책장 구경하기'}
    </div>
  </div>
);

const Image = async ({ params }: Props) => {
  const { username } = await params;

  // 조회가 실패해도 카드는 나가야 한다 — 미리보기가 없는 것보다 브랜드 카드라도 나은 편이다.
  // (프로필이 없는 URL 로 크롤러가 들어오는 경우도 여기로 떨어진다)
  let found = false;
  let totalBooks = 0;
  let covers: string[] = [];
  let card: ReaderCard = { identity: null, stat: null };

  try {
    // 서재 상단 명함과 같은 규칙 — 미리보기와 눌러 들어간 화면이 같은 사람을 말해야 한다
    const data = await getReaderShareData(username);

    if (data) {
      found = true;
      ({ totalBooks, covers, card } = data);
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
    // 성향이 있으면 독서 명함 두 줄, 없으면 예전처럼 권수 한 줄 — 이름은 아래 제목이 말한다
    <StageCard
      cta={
        card.identity ? (
          <ReaderBand identity={card.identity} stat={card.stat} />
        ) : (
          `${totalBooks}권이 꽂힌 책장 구경하기`
        )
      }
    >
      <CoverRow covers={covers} />
    </StageCard>
  );
};

export default Image;
