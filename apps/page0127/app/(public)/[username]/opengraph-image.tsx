import { ImageResponse } from 'next/og';

import { CardFrame, Wordmark } from '@/shared/lib/og/CardFrame';
import {
  BRAND_SPINES,
  OG_CACHE_CONTROL,
  OG_COLORS,
  OG_SIZE,
  textWidth,
  titleFontSize,
  truncate,
} from '@/shared/lib/og/theme';

import {
  COVER_LIMIT,
  getPublicShelfSummary,
} from '@/entities/book/api/getPublicShelfSummary';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

// 공개 책장의 동적 OG 이미지 — "누구의 책장인가"를 카드가 말하게 한다.
//
// 소개 페이지(/about)의 '공개 서재' 카드와 같은 구도다 — 파란 무대 위에 최근 표지 5장을
// 세우고, 아래 흰 띠에 이름·권수·주소를 둔다. 소개 페이지에서 "링크로 공유하면 이렇게
// 보여요"라고 약속한 모습과 실제 미리보기가 달랐기 때문에 맞췄다(2026-10-06).
// 이전 카드(흰 면 + 흐린 책등)는 숫자가 주인공이었지만, 표지가 있으면 "어떤 책을
// 읽는 사람인가"가 숫자보다 먼저 읽힌다.
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

/** 무대(파란 면) 높이 — 표지가 서고 남은 아래 띠에 글자 세 줄이 들어간다 */
const STAGE_HEIGHT = 380;

/**
 * 표지 한 장 크기 (2:3 판형). 5장 + 간격이 카드 폭의 85% 를 차지한다.
 * 카톡 미리보기처럼 작게 줄어도 표지가 알아보이는 크기다.
 */
const COVER = { width: 180, height: 270 };
const COVER_GAP = 24;

/**
 * 표지가 무대 바닥선 아래로 내려오는 깊이.
 * 소개 카드의 `-mb-1.5` 처럼 살짝 걸치게 해야 "선반에 꽂힌" 느낌이 난다.
 */
const COVER_OVERHANG = 14;

/**
 * 소개 페이지 `.stage-blue` 를 satori 로 옮긴 것 (packages/ui/src/styles/index.css).
 * CSS 변수를 못 읽으므로 blue/400~700 토큰 값을 그대로 적는다.
 */
const STAGE_BACKGROUND = [
  'radial-gradient(80% 60% at 50% 0%, #438ef2 0%, transparent 60%)',
  'linear-gradient(165deg, #2d78db 0%, #1e69cb 40%, #0455bf 100%)',
].join(', ');

/**
 * 표지 한 장. 빈 판형을 먼저 깔고 그 위에 표지를 덮는다.
 *
 * 표지 URL 이 죽어 있으면 satori 는 에러 없이 **그림만 빼고** 그린다. 그때 뒤에 깐
 * 판형이 드러나야 표지 줄에 구멍이 뚫리지 않는다. 표지가 5장보다 적은 책장도
 * 같은 판형으로 빈 자리를 채워 카드 구도가 유지된다.
 */
const Cover = ({ src, last }: { src: string | null; last: boolean }) => (
  <div
    style={{
      display: 'flex',
      position: 'relative',
      width: COVER.width,
      height: COVER.height,
      marginRight: last ? 0 : COVER_GAP,
      borderRadius: 8,
      overflow: 'hidden',
      // 흰 15% — 파란 무대 위에서 "자리는 있다"로만 읽히는 밝기
      background: 'rgba(255, 255, 255, 0.15)',
      boxShadow: '0 12px 28px rgba(4, 30, 80, 0.35)',
    }}
  >
    {src ? (
      <img
        src={src}
        alt=''
        width={COVER.width}
        height={COVER.height}
        style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
      />
    ) : null}
  </div>
);

/** 프로필을 못 찾았을 때의 브랜드 카드 — 이전 디자인을 그대로 둔다 */
const FallbackCard = () => (
  <CardFrame spines={BRAND_SPINES}>
    <Wordmark size={38} />
    <div
      style={{
        display: 'flex',
        marginTop: 24,
        fontSize: titleFontSize(textWidth('책장을 보면, 그 사람이 보인다')),
        fontWeight: 700,
        // 한글은 글리프가 커서 lineHeight 1.25 로는 윗줄을 침범한다
        lineHeight: 1.3,
      }}
    >
      책장을 보면, 그 사람이 보인다
    </div>
    <div
      style={{
        display: 'flex',
        marginTop: 24,
        fontSize: 27,
        color: OG_COLORS.inkSoft,
      }}
    >
      한 권씩 채우면, 취향이 보입니다
    </div>
  </CardFrame>
);

const Image = async ({ params }: Props) => {
  const { username } = await params;

  // 조회가 실패해도 카드는 나가야 한다 — 미리보기가 없는 것보다 브랜드 카드라도 나은 편이다.
  // (프로필이 없는 URL 로 크롤러가 들어오는 경우도 여기로 떨어진다)
  let name: string | null = null;
  let totalBooks = 0;
  let lifeBooks = 0;
  let covers: string[] = [];

  try {
    const profile = await getPublicProfileByUsername(username);

    if (profile) {
      name = toDisplayName(profile);
      const summary = await getPublicShelfSummary(profile.id);
      totalBooks = summary.totalBooks;
      lifeBooks = summary.lifeBooks;
      covers = summary.covers;
    }
  } catch (error) {
    console.error('책장 OG 조회 실패:', error);
  }

  if (!name) {
    return new ImageResponse(<FallbackCard />, {
      ...size,
      headers: { 'Cache-Control': OG_CACHE_CONTROL },
    });
  }

  // 0권이면 숫자를 세지 않는다 — "0권"은 초대가 아니라 빈 성적표로 읽힌다
  const statLine =
    totalBooks === 0
      ? '한 권씩 채우면, 취향이 보입니다'
      : lifeBooks > 0
        ? `읽은 책 ${totalBooks}권 · 인생책 ${lifeBooks}권`
        : `읽은 책 ${totalBooks}권`;

  // 표지가 모자라면 빈 판형으로 채워 늘 5칸을 유지한다
  const slots = Array.from(
    { length: COVER_LIMIT },
    (_, i) => covers[i] ?? null
  );

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: OG_COLORS.paper,
        color: OG_COLORS.ink,
        // 폰트를 지정하지 않는다 — next/og 가 등장 글자만 Google Fonts 에서 받아온다
        fontFamily: 'sans-serif',
      }}
    >
      {/* 무대 — 표지는 바닥선에 붙여 세운다 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          height: STAGE_HEIGHT,
          backgroundImage: STAGE_BACKGROUND,
        }}
      >
        <div
          style={{
            display: 'flex',
            // 바닥선 아래로 살짝 걸친다. 무대 밖으로 나간 부분은 흰 띠 위에 그려진다
            marginBottom: -COVER_OVERHANG,
          }}
        >
          {slots.map((src, i) => (
            // 표지 URL 은 요약에서 중복을 걸렀으므로 그대로 key 가 된다. 빈 칸만 자리 번호로 구분한다
            <Cover
              key={src ?? `empty-${i}`}
              src={src}
              last={i === COVER_LIMIT - 1}
            />
          ))}
        </div>
      </div>

      {/*
        정보 띠 — 가운데 정렬. 일부 플랫폼이 1.91:1 카드를 정사각으로 잘라 쓰는데,
        좌측 정렬이면 오른쪽이 잘려도 티가 안 나는 대신 가운데 정렬은 어느 쪽이 잘려도
        이름과 숫자가 남는다(shared/lib/og/CardFrame.tsx 와 같은 이유).
      */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          // 표지가 걸친 만큼 위를 띄운다
          paddingTop: COVER_OVERHANG,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 50,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {truncate(name, NAME_MAX_WIDTH)}님의 책장
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 6,
            fontSize: 30,
            color: OG_COLORS.inkSoft,
          }}
        >
          {statLine}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 10,
            fontSize: 26,
            fontWeight: 700,
            color: OG_COLORS.accentDeep,
          }}
        >
          {/* 주소는 이름(표시명)이 아니라 URL 의 username 이다 — 실제로 눌러 갈 곳을 적는다 */}
          {`page0127.com/${truncate(username, NAME_MAX_WIDTH)}`}
        </div>
      </div>
    </div>,
    {
      ...size,
      // next/og 기본값은 max-age=0 이라 크롤러가 부를 때마다 다시 그린다
      headers: { 'Cache-Control': OG_CACHE_CONTROL },
    }
  );
};

export default Image;
