import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

import { OG_FONT_FAMILY } from './render';
import { OG_COLORS, OG_SIZE, truncate } from './theme';

/**
 * 공유 카드(OG 이미지)의 공통 틀 — ⚠️ satori(next/og) 전용, 브라우저로 나가지 않는다
 *
 * 모든 카드가 **파란 무대 + 흰 띠 한 줄** 구조다.
 * - 무대: 소개 페이지(/about) `.stage-blue` 와 같은 그라데이션. 카드마다 다른 주인공
 *   (표지 줄·표지 한 장·슬로건)이 여기 선다.
 * - 흰 띠: 왼쪽에 "누르면 무엇을 보게 되는지" 한 줄, 오른쪽에 `page0127.` 워드마크.
 *
 * 왜 글자를 한 줄로 줄였나: 카톡·슬랙은 이미지 바로 아래에 페이지 제목과 설명을
 * 또 붙인다. 이미지 안에 이름·제목을 다시 쓰면 같은 말이 두 번 나온다(2026-10-07).
 * 그래서 이미지에는 **아래 글에 없는 것**(표지, 권수, 별점, 한줄평)만 싣는다.
 *
 * 링크마다 카드 생김새가 다르면 같은 서비스로 안 읽히므로, 홈·책장·책 기록·도서
 * 카드가 전부 이 틀을 쓴다.
 */

/** 무대 높이. 남은 630 − 480 = 150px 가 흰 띠다 */
export const STAGE_HEIGHT = 480;

/** 좌우 여백 — 표지 줄 5장(200×5 + 20×4 = 1080)이 정확히 들어가는 값 */
export const STAGE_GUTTER = 60;

/**
 * 표지가 무대 바닥선 아래로 내려오는 깊이.
 * 소개 카드의 `-mb-1.5` 처럼 살짝 걸치게 해야 "선반에 꽂힌" 느낌이 난다.
 */
export const COVER_OVERHANG = 14;

/**
 * 무대 배경 — 블루 토큰(blue/300~800)으로 만든 메시 그라데이션.
 *
 * 처음에는 `.stage-blue`(packages/ui/src/styles/index.css)를 그대로 옮겼는데,
 * 위쪽 빛 번짐 가운데에 **어두운 띠**가 생겼다. satori 는 `transparent` 를
 * "투명한 검정"으로 보고 섞어서, 밝은 파랑이 사라지는 자리가 회색으로 탁해진다.
 * 그래서 빛마다 **같은 색의 알파 0** 으로 끝낸다.
 *
 * 구성: 진한 파랑 바탕 위에 빛 세 개를 겹친다(2026-10-07 피드백 "트렌디한 배경").
 * - 왼쪽 위: 밝은 하늘색 — 슬로건 뒤를 밝혀 흰 글자가 떠 보이게 한다
 * - 오른쪽 위: 옅은 파랑 — 책 무리 뒤를 받친다
 * - 오른쪽 아래: 짙은 남색 — 바닥을 눌러 책이 "놓인" 느낌을 준다
 * 뒤에 적은 것이 아래에 깔린다(CSS 다중 배경 규칙).
 */
const STAGE_BACKGROUND = [
  'radial-gradient(60% 75% at 8% 0%, rgba(147, 192, 251, 0.75) 0%, rgba(147, 192, 251, 0) 100%)',
  'radial-gradient(55% 70% at 92% 10%, rgba(91, 159, 245, 0.7) 0%, rgba(91, 159, 245, 0) 100%)',
  'radial-gradient(60% 70% at 100% 100%, rgba(10, 47, 110, 0.85) 0%, rgba(10, 47, 110, 0) 100%)',
  'linear-gradient(135deg, #2d78db 0%, #1e69cb 45%, #0455bf 100%)',
].join(', ');

/** 무대 위 흰 글자의 보조 톤 — 파란 바탕에서 AA 를 넘는 가장 옅은 값 */
export const STAGE_TEXT_SOFT = 'rgba(255, 255, 255, 0.85)';

/** 흰 띠 오른쪽 워드마크 — 이름은 끝의 점까지다(page0127. = 페이지 읽다) */
const BrandMark = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <BrandSymbol size={36} />
    <div
      style={{
        display: 'flex',
        marginLeft: 10,
        fontSize: 27,
        fontWeight: 800,
        // 워드마크는 글자가 촘촘해야 한 덩어리 로고로 읽힌다
        letterSpacing: -0.5,
        color: OG_COLORS.ink,
      }}
    >
      page0127.
    </div>
  </div>
);

type StageCardProps = {
  /** 무대 위에 세울 것. 무대는 position: relative 라 absolute 배치도 된다 */
  children: React.ReactNode;
  /** 흰 띠 왼쪽 한 줄 — "누르면 무엇을 보게 되는지" */
  cta: string;
};

export const StageCard = ({ children, cta }: StageCardProps) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: OG_COLORS.paper,
      color: OG_COLORS.ink,
      // 사이트 본문과 같은 Pretendard — 폰트 파일은 render.tsx 가 붙인다
      fontFamily: OG_FONT_FAMILY,
    }}
  >
    <div
      style={{
        display: 'flex',
        position: 'relative',
        height: STAGE_HEIGHT,
        backgroundImage: STAGE_BACKGROUND,
      }}
    >
      {children}
    </div>

    {/*
      흰 띠 — 왼쪽 정렬 한 줄. 무대에서 내려온 표지가 걸친 만큼 위를 띄운다.
      띠에 배경색을 주지 않는다: 주면 무대 밖으로 걸친 표지 끝을 덮어 버린다.
    */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        paddingTop: COVER_OVERHANG,
        paddingLeft: STAGE_GUTTER,
        paddingRight: STAGE_GUTTER,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 38,
          fontWeight: 700,
          letterSpacing: -0.5,
        }}
      >
        {cta}
        {/* 화살표만 브랜드 블루 — "누르면 간다"가 색으로도 읽힌다 */}
        <div
          style={{
            display: 'flex',
            marginLeft: 14,
            color: OG_COLORS.accentDeep,
          }}
        >
          →
        </div>
      </div>
      <BrandMark />
    </div>
  </div>
);

/**
 * 표지 한 장. 빈 판형을 먼저 깔고 그 위에 표지를 덮는다.
 *
 * 표지 URL 이 죽어 있으면 satori 는 에러 없이 **그림만 빼고** 그린다. 그때 뒤에 깐
 * 판형이 드러나야 표지 자리에 구멍이 뚫리지 않는다.
 */
export const Cover = ({
  src,
  width,
  height,
}: {
  src: string;
  width: number;
  height: number;
}) => (
  <div
    style={{
      display: 'flex',
      position: 'relative',
      width,
      height,
      flexShrink: 0,
      borderRadius: 8,
      overflow: 'hidden',
      // 흰 15% — 파란 무대 위에서 "자리는 있다"로만 읽히는 밝기
      background: 'rgba(255, 255, 255, 0.15)',
      boxShadow: '0 12px 28px rgba(4, 30, 80, 0.35)',
    }}
  >
    {/* satori 는 next/image 를 렌더하지 못한다 — 이 파일은 브라우저로 나가지 않는다 */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={src}
      alt=''
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
    />
  </div>
);

/** 표지 줄의 한 장 크기 (2:3 판형) — 5장이면 무대 폭을 여백 빼고 꽉 채운다 */
export const ROW_COVER = { width: 200, height: 300 } as const;
const ROW_GAP = 20;

/**
 * 표지 줄 — 무대 바닥선에 붙여 왼쪽부터 세운다.
 *
 * 5장보다 적으면 **있는 만큼만** 세운다. 빈 판형으로 칸을 채우던 때가 있었는데,
 * 카톡 썸네일에서 "이미지가 덜 불러와졌다"로 보였다(2026-10-07).
 * 왼쪽부터 세우는 이유: 흰 띠의 한 줄과 같은 선에서 시작해야 한 장으로 읽힌다.
 */
export const CoverRow = ({ covers }: { covers: readonly string[] }) => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      left: STAGE_GUTTER,
      bottom: -COVER_OVERHANG,
    }}
  >
    {covers.map((src, i) => (
      <div
        key={src}
        style={{ display: 'flex', marginLeft: i === 0 ? 0 : ROW_GAP }}
      >
        <Cover src={src} {...ROW_COVER} />
      </div>
    ))}
  </div>
);

/**
 * 무대 오른쪽에 꽂힌 책 몇 권 — 크기·색을 하나하나 정해 둔다.
 *
 * 처음에는 카드 폭을 꽉 채운 책장(반투명 → 불투명 + 장식 띠)이었는데, 막대그래프처럼
 * 보였고 슬로건과 자리를 다퉜다(2026-10-07 피드백). 지금은 글자는 왼쪽, 책은 오른쪽에
 * 몇 권만 둔다. 권수가 적으니 규칙으로 돌리지 않고 직접 적는다 — 높이·폭이 들쭉날쭉해야
 * 실제 책장처럼 보인다.
 *
 * 색은 불투명. 진한 남색·흰색·옅은 파랑을 번갈아 세워 이웃끼리 색이 겹치지 않게 하고,
 * 민트는 한 권만 — "한 권이 특별하다"는 브랜드 강조다.
 */
const BOOKS = [
  { w: 46, h: 250, c: '#0a2f6e' },
  { w: 38, h: 300, c: '#ffffff' },
  { w: 54, h: 270, c: '#93c0fb' },
  { w: 40, h: 320, c: '#14294e' },
  { w: 50, h: 285, c: '#6ee7b7' },
  { w: 36, h: 240, c: '#d6e6fd' },
  // 무대 바탕(blue/700)과 같은 색이면 묻힌다 — 바탕보다 확실히 어두운 남색
  { w: 48, h: 305, c: '#0f1f3d' },
] as const;

/** 책 사이 틈 — 실제 책장에서 책은 거의 맞닿아 있다 */
const BOOK_GAP = 4;

/** 마지막에 비스듬히 기댄 책 — 줄 세운 막대가 아니라 "꽂아 둔 책"으로 읽히게 한다 */
const LEANING_BOOK = { w: 44, h: 270, c: '#ffffff', angle: 14 } as const;

/**
 * 기댄 책을 오른쪽으로 띄우는 거리 — 위 모서리가 왼쪽 책에 닿게 하는 값.
 * 아래 오른쪽 모서리를 축으로 돌리면 위 왼쪽 모서리가 h·sin(각도) 만큼 왼쪽으로 온다.
 */
const LEAN_OFFSET = Math.round(
  LEANING_BOOK.h * Math.sin((LEANING_BOOK.angle * Math.PI) / 180)
);

/**
 * 오른쪽 책 무리 — 무대 바닥선에 세운다. 오른쪽 끝은 흰 띠의 워드마크와 같은 선이다.
 */
export const StageBooks = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      position: 'absolute',
      right: STAGE_GUTTER + 40,
      bottom: 0,
    }}
  >
    {BOOKS.map((b, i) => (
      <div
        key={`${b.c}-${b.h}`}
        style={{
          display: 'flex',
          width: b.w,
          height: b.h,
          marginLeft: i === 0 ? 0 : BOOK_GAP,
          borderRadius: '5px 5px 0 0',
          background: b.c,
        }}
      />
    ))}
    {/* 기댄 책 — 아래 오른쪽 모서리를 축으로 왼쪽 책 쪽으로 눕힌다 */}
    <div
      style={{
        display: 'flex',
        width: LEANING_BOOK.w,
        height: LEANING_BOOK.h,
        marginLeft: LEAN_OFFSET,
        borderRadius: '5px 5px 0 0',
        background: LEANING_BOOK.c,
        transform: `rotate(-${LEANING_BOOK.angle}deg)`,
        transformOrigin: 'bottom right',
      }}
    />
  </div>
);

type BrandStageProps = {
  /** 흰 띠 한 줄 */
  cta: string;
};

/**
 * 브랜드 카드 — 표지가 없는 모든 경우의 기본 카드.
 * 홈·소개·로그인 등 루트 OG, 없는 사용자, 아직 책이 없는 책장, 비공개 기록이 쓴다.
 */
export const BrandStage = ({ cta }: BrandStageProps) => (
  <StageCard cta={cta}>
    {/* 슬로건 — 왼쪽, 무대 안에서 세로 가운데. 흰 띠의 한 줄과 같은 왼쪽 선이다 */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'absolute',
        left: STAGE_GUTTER,
        top: 0,
        height: STAGE_HEIGHT,
        fontSize: 80,
        fontWeight: 800,
        color: OG_COLORS.paper,
        // 큰 글자는 자간을 좁혀야 단어가 한 덩어리로 읽힌다
        letterSpacing: -2.5,
        lineHeight: 1.2,
      }}
    >
      {/* satori 는 <br/> 을 못 다룬다 — 줄마다 div 로 쌓는다 */}
      <div>책장을 보면,</div>
      <div>그 사람이 보인다</div>
    </div>
    <StageBooks />
  </StageCard>
);

/** 표지 한 장이 주인공인 카드의 표지 크기 (2:3) — 무대 480 안에 위 여백을 두고 선다 */
const FEATURE_COVER = { width: 240, height: 360 } as const;

/** 표지와 글자 칸 사이 */
const FEATURE_GAP = 56;

/** 글자 칸의 왼쪽 끝과 폭 — 정해 두지 않으면 긴 글에서 칸이 한 글자 폭으로 쪼그라든다 */
const COLUMN_LEFT = STAGE_GUTTER + FEATURE_COVER.width + FEATURE_GAP;
export const FEATURE_COLUMN_WIDTH = OG_SIZE.width - COLUMN_LEFT - STAGE_GUTTER;

type FeatureStageProps = {
  /** 표지 URL. 없으면 같은 크기의 빈 판형을 세운다 */
  cover: string | null;
  /** 표지 오른쪽 글자 칸 — 무대 안에서 세로 가운데에 놓인다 */
  children: React.ReactNode;
};

/**
 * 표지 한 장 + 글자 칸 — 책 기록·도서 상세 카드의 무대.
 *
 * 이전 책 기록 카드는 글자 칸의 폭을 flex 에 맡겼다가, 제목이 긴 책에서 칸이
 * 쪼그라들어 글자가 세로로 쏟아졌다(2026-10-07 점검). 그래서 위치와 폭을 숫자로 못박는다.
 */
export const FeatureStage = ({ cover, children }: FeatureStageProps) => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: STAGE_HEIGHT,
    }}
  >
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        left: STAGE_GUTTER,
        bottom: -COVER_OVERHANG,
      }}
    >
      {cover ? (
        <Cover src={cover} {...FEATURE_COVER} />
      ) : (
        <div
          style={{
            display: 'flex',
            ...FEATURE_COVER,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.15)',
          }}
        />
      )}
    </div>

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'absolute',
        left: COLUMN_LEFT,
        top: 0,
        width: FEATURE_COLUMN_WIDTH,
        height: STAGE_HEIGHT,
        color: OG_COLORS.paper,
      }}
    >
      {children}
    </div>
  </div>
);

/** 제목·저자 칸의 폭 상한 (한글 글자 수) */
const TITLE_MAX_WIDTH = 24;
const AUTHOR_MAX_WIDTH = 24;

type StageBookTitleProps = {
  title: string;
  author: string | null;
  /** 위 요소와의 간격 */
  marginTop?: number;
};

/**
 * 무대 위 책 제목·저자 — 표지 옆에 다른 할 말이 없을 때만 쓴다.
 * 제목은 카톡이 이미지 아래에도 보여 주므로, 카드의 주인공이 될 정보가 있으면 그쪽을 쓴다.
 */
export const StageBookTitle = ({
  title,
  author,
  marginTop = 0,
}: StageBookTitleProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      marginTop,
      width: FEATURE_COLUMN_WIDTH,
    }}
  >
    <div
      style={{
        display: 'flex',
        fontSize: 46,
        fontWeight: 700,
        lineHeight: 1.35,
      }}
    >
      {/* 부제(' - ' 뒤)는 버린다 — 카드에서는 본 제목만으로 충분하다 */}
      {truncate(title.split(' - ')[0], TITLE_MAX_WIDTH)}
    </div>
    {author ? (
      <div
        style={{
          display: 'flex',
          marginTop: 12,
          fontSize: 28,
          color: STAGE_TEXT_SOFT,
        }}
      >
        {truncate(author, AUTHOR_MAX_WIDTH)}
      </div>
    ) : null}
  </div>
);
