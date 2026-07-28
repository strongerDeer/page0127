import { ImageResponse } from 'next/og';

import { BookShelf } from '@/shared/lib/og/BookShelf';
import {
  BOOK_SPINES,
  OG_CACHE_CONTROL,
  OG_COLORS,
  OG_SIZE,
  shelfTitleFontSize,
  spinesFor,
  truncate,
} from '@/shared/lib/og/theme';

import { getPublicShelfSummary } from '@/entities/book/api/getPublicShelfSummary';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

// 공개 책장의 동적 OG 이미지 — "누구의 책장인가"를 카드가 말하게 한다.
//
// runtime 을 지정하지 않는다 = Node.js 런타임.
// 'edge' 로 두면 next/og(satori + resvg wasm, ~2.4MB)가 Edge Function 번들에 통째로
// 실려 Vercel Hobby 의 1MB 한도를 넘긴다. 빌드는 통과하고 "Deploying outputs..."
// 단계에서 배포만 실패하므로 빌드 로그로는 원인이 안 보인다(app/opengraph-image.tsx 참조).
//
// 한글 폰트도 번들하지 않는다 — next/og 가 Google Fonts 에서 이 이미지에 등장한
// 글자만 subset 으로 받아온다. 그 요청이 실패하면 예외 없이 글자만 사라지므로
// (index.node.js 의 loadDynamicAsset 은 console.error 만 하고 넘어간다),
// 닉네임을 짧게 자르고 카드의 뼈대는 책등이 지도록 짰다.

export const alt = '공개 책장 | page0127';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ username: string }>;
};

/**
 * 닉네임 상한. 이보다 길면 잘라내고, 그래도 긴 이름은 글자 크기를 줄여 받는다
 * (shelfTitleFontSize) — 줄이 접히면 "책장" 이 셋째 줄로 밀려 카드가 어색해진다.
 */
const NAME_MAX = 10;

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

  const spines = name ? spinesFor(totalBooks) : BOOK_SPINES;

  // 첫 줄은 "{이름}님의" 다 — 이름만이 아니라 조사까지 세야 폭이 맞는다
  const shownName = name ? truncate(name, NAME_MAX) : null;
  const titleFontSize = shelfTitleFontSize(
    shownName ? [...shownName].length + 2 : 8
  );

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: OG_COLORS.ink,
        color: OG_COLORS.paper,
        fontFamily: 'sans-serif',
        padding: '64px 72px',
      }}
    >
      {/* 좌: 누구의 책장이고 무엇이 들어 있는가 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          paddingRight: 40,
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, opacity: 0.65 }}>
          page0127
        </div>

        {/* Satori 제약: 자식이 2개 이상인 div 는 display 를 명시해야 한다 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 28,
            fontSize: titleFontSize,
            fontWeight: 700,
            // 한글은 글리프가 커서 lineHeight 1.25 로는 윗줄을 침범한다
            lineHeight: 1.4,
          }}
        >
          <div>{shownName ? `${shownName}님의` : '책장을 보면,'}</div>
          <div>{shownName ? '책장' : '그 사람이 보인다'}</div>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 30,
            opacity: 0.75,
          }}
        >
          {/* 0권이면 권수를 세지 않는다 — "0권"은 초대가 아니라 빈 성적표로 읽힌다 */}
          {!name || totalBooks === 0
            ? '읽은 책이 모여 책장이 됩니다'
            : `읽은 책 ${totalBooks}권${
                lifeBooks > 0 ? ` · 인생책 ${lifeBooks}권` : ''
              }`}
        </div>
      </div>

      {/* 우: 실제 권수만큼 세운 책등 — 글자가 다 사라져도 이 형태는 남는다 */}
      <BookShelf spines={spines} />
    </div>,
    {
      ...size,
      // next/og 기본값은 max-age=0 이라 크롤러가 부를 때마다 다시 그린다
      headers: { 'Cache-Control': OG_CACHE_CONTROL },
    }
  );
};

export default Image;
