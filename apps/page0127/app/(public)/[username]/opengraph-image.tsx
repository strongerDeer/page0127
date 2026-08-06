import { ImageResponse } from 'next/og';

import { CardFrame, Wordmark } from '@/shared/lib/og/CardFrame';
import {
  BRAND_SPINES,
  OG_CACHE_CONTROL,
  OG_COLORS,
  OG_SIZE,
  spinesFor,
  textWidth,
  titleFontSize,
  truncate,
} from '@/shared/lib/og/theme';

import { getPublicShelfSummary } from '@/entities/book/api/getPublicShelfSummary';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

// 공개 책장의 동적 OG 이미지 — "누구의 책장인가"를 카드가 말하게 한다.
//
// 이 카드의 주인공은 **숫자**다. 홈 카드가 서비스를 설명한다면 이 카드는
// "이 사람이 157권 읽었다"를 전한다. 그래서 권수만 글자 크기를 키웠다.
//
// runtime 을 지정하지 않는다 = Node.js 런타임.
// 'edge' 로 두면 next/og(satori + resvg wasm, ~2.4MB)가 Edge Function 번들에 통째로
// 실려 Vercel Hobby 의 1MB 한도를 넘긴다. 빌드는 통과하고 "Deploying outputs..."
// 단계에서 배포만 실패하므로 빌드 로그로는 원인이 안 보인다(app/opengraph-image.tsx 참조).
//
// 한글 폰트도 번들하지 않는다 — next/og 가 Google Fonts 에서 이 이미지에 등장한
// 글자만 subset 으로 받아온다. 그 요청이 실패하면 예외 없이 글자만 사라지므로
// (index.node.js 의 loadDynamicAsset 은 console.error 만 하고 넘어간다),
// 이름을 짧게 자르고 카드의 뼈대는 책등이 지도록 짰다.

export const alt = '공개 책장 | page0127';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ username: string }>;
};

/**
 * 이름이 차지할 수 있는 최대 폭(한글 글자 수 기준).
 * 글자 수가 아니라 폭으로 재기 때문에 라틴 이름은 훨씬 많은 글자가 들어간다
 * (`stronger_deer` 는 13자지만 폭은 7.2 라 잘리지 않는다).
 */
const NAME_MAX_WIDTH = 16;

/**
 * 숫자를 라벨보다 크게 세워 카드에서 제일 먼저 읽히게 한다.
 *
 * 간격을 gap 이 아니라 margin 으로 주는 이유: satori 의 gap 처리가 미덥지 않아
 * "155권인생책 17권" 처럼 붙어 나온 적이 있다. margin 은 확실하게 먹는다.
 */
const Stat = ({
  label,
  value,
  last = false,
}: {
  label: string;
  value: number;
  last?: boolean;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      // space/12 — 두 통계가 한 덩어리로 붙어 보이지 않을 만큼만 띄운다
      marginRight: last ? 0 : 48,
    }}
  >
    <div
      style={{
        display: 'flex',
        fontSize: 26,
        color: OG_COLORS.inkSoft,
        marginRight: 8,
      }}
    >
      {label}
    </div>
    <div
      style={{
        display: 'flex',
        fontSize: 58,
        fontWeight: 700,
        color: OG_COLORS.accentDeep,
        // 큰 글자의 아랫선을 라벨에 맞춘다 — satori 는 baseline 정렬이 불안정하다
        lineHeight: 1,
        marginRight: 8,
      }}
    >
      {value}
    </div>
    <div style={{ display: 'flex', fontSize: 26, color: OG_COLORS.inkSoft }}>
      권
    </div>
  </div>
);

const Image = async ({ params }: Props) => {
  const { username } = await params;

  // 조회가 실패해도 카드는 나가야 한다 — 미리보기가 없는 것보다 브랜드 카드라도 나은 편이다.
  // (프로필이 없는 URL 로 크롤러가 들어오는 경우도 여기로 떨어진다)
  let name: string | null = null;
  let totalBooks = 0;
  let lifeBooks = 0;

  try {
    const profile = await getPublicProfileByUsername(username);

    if (profile) {
      name = toDisplayName(profile);
      const summary = await getPublicShelfSummary(profile.id);
      totalBooks = summary.totalBooks;
      lifeBooks = summary.lifeBooks;
    }
  } catch (error) {
    console.error('책장 OG 조회 실패:', error);
  }

  const shownName = name ? truncate(name, NAME_MAX_WIDTH) : null;
  const title = shownName
    ? `${shownName}님의 책장`
    : '책장을 보면, 그 사람이 보인다';

  // 0권이면 숫자를 세지 않는다 — "0권"은 초대가 아니라 빈 성적표로 읽힌다
  const hasStats = Boolean(shownName) && totalBooks > 0;

  return new ImageResponse(
    <CardFrame spines={shownName ? spinesFor(totalBooks) : BRAND_SPINES}>
      <Wordmark size={38} />

      <div
        style={{
          display: 'flex',
          marginTop: 24,
          fontSize: titleFontSize(textWidth(title)),
          fontWeight: 700,
          // 한글은 글리프가 커서 lineHeight 1.25 로는 윗줄을 침범한다
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>

      {/*
        Fragment 로 두 Stat 을 묶지 않는다: satori 가 Fragment 를 flex 자식으로
        세지 못해 두 항목이 한 덩어리로 붙어 렌더된 적이 있다.
      */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          marginTop: 24,
        }}
      >
        {!hasStats ? (
          <div
            style={{
              display: 'flex',
              fontSize: 27,
              color: OG_COLORS.inkSoft,
            }}
          >
            한 권씩 채우면, 취향이 보입니다
          </div>
        ) : null}

        {hasStats ? (
          <Stat label='읽은 책' value={totalBooks} last={lifeBooks === 0} />
        ) : null}

        {hasStats && lifeBooks > 0 ? (
          <Stat label='인생책' value={lifeBooks} last />
        ) : null}
      </div>
    </CardFrame>,
    {
      ...size,
      // next/og 기본값은 max-age=0 이라 크롤러가 부를 때마다 다시 그린다
      headers: { 'Cache-Control': OG_CACHE_CONTROL },
    }
  );
};

export default Image;
