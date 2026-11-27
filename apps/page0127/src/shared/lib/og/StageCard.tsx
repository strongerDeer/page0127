import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

import { balancedWrap } from './balanceLines';
import { BookShelf } from './BookShelf';
import { OG_FONT_FAMILY } from './render';
import { OG_COLORS, OG_SIZE, textWidth, truncate } from './theme';

/**
 * 공유 카드(OG 이미지)의 공통 틀 — ⚠️ satori(next/og) 전용, 브라우저로 나가지 않는다
 *
 * 모든 카드가 **파란 무대 + 흰 띠 한 줄** 구조다.
 * - 무대: 소개 페이지(/about) `.stage-blue` 와 같은 그라데이션. 위 가운데에 슬로건,
 *   그 아래 가운데에 카드마다 다른 주인공(책장·표지·그림)이 선다.
 * - 흰 띠: 가운데에 `page0127. │ 누르면 무엇을 보게 되는지 →` 한 덩어리.
 *
 * 왜 전부 가운데인가(HJ 2026-11-27): 카톡·DM·메신저가 같은 1200×630 그림을 제각각
 * 정사각형·작은 썸네일로 잘라 쓴다. 가운데 630×630 안에 슬로건·그림·로고가 다 들어가야
 * 어디서 잘려도 무슨 링크인지 읽힌다(업계에서 '안전 영역'이라 부르는 방식).
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

/** 좌우 여백 — 글 칸이 카드 끝에 붙지 않게 하는 최소 간격 */
export const STAGE_GUTTER = 60;

/** 무대 가로 가운데 — 주인공 그림은 이 선에 가운데를 맞춘다 */
export const STAGE_CENTER = OG_SIZE.width / 2;

/** 슬로건 윗변(HJ 2026-11-27 "글자 위 여백 두 배")과 글자 크기 */
export const SLOGAN_TOP = 80;
const SLOGAN_SIZE = 46;

/** 슬로건 아래 주인공 그림의 윗변 — 흰 띠에서 잘리는 그림(StageCrop)이 여기서 시작한다 */
export const OBJECT_TOP = 236;

/**
 * 표지가 무대 바닥선 아래로 내려오는 깊이.
 * 소개 카드의 `-mb-1.5` 처럼 살짝 걸치게 해야 "선반에 꽂힌" 느낌이 난다.
 */
export const COVER_OVERHANG = 11;

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
 * 서재 스토리 이미지(StoryCard)도 같은 바탕을 쓴다.
 */
export const STAGE_BACKGROUND = [
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
    <BrandSymbol size={28} />
    <div
      style={{
        display: 'flex',
        marginLeft: 8,
        fontSize: 21,
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
  /**
   * 흰 띠 — "누르면 무엇을 보게 되는지". 보통 한 줄 문자열이고,
   * 공개 서재처럼 두 줄(독서 명함)을 세울 때는 노드를 넘긴다(글자 크기 26 · 굵게를 물려받는다).
   */
  cta: React.ReactNode;
};

/**
 * 흰 띠 문구 크기 — 로고까지 합쳐 가운데 630 폭 안에 들게, 긴 문구는 조금 줄인다.
 * 노드(독서 명함)는 26 그대로 — 그쪽이 줄 수를 스스로 정한다.
 */
const CTA_MAX_SIZE = 26;
const CTA_MAX_WIDTH = 290;
const ctaFontSize = (cta: React.ReactNode): number =>
  typeof cta === 'string'
    ? Math.min(CTA_MAX_SIZE, Math.floor(CTA_MAX_WIDTH / textWidth(cta)))
    : CTA_MAX_SIZE;

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
      흰 띠 — 로고와 한 줄을 묶어 가운데에 둔다. 정사각형으로 잘려도 둘이 같이 남는다.
      띠에 배경색을 주지 않는다: 주면 무대 밖으로 걸친 표지 끝을 덮어 버린다.
    */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingTop: COVER_OVERHANG,
      }}
    >
      <BrandMark />
      {/* 로고와 문구 사이 세로 줄 */}
      <div
        style={{
          display: 'flex',
          width: 2,
          height: 22,
          margin: '0 18px',
          background: OG_COLORS.line,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: ctaFontSize(cta),
          fontWeight: 700,
          letterSpacing: -0.4,
        }}
      >
        {cta}
        {/* 화살표만 브랜드 블루 — "누르면 간다"가 색으로도 읽힌다 */}
        <div
          style={{
            display: 'flex',
            marginLeft: 8,
            color: OG_COLORS.accentDeep,
          }}
        >
          →
        </div>
      </div>
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
  shadow = '0 12px 28px rgba(4, 30, 80, 0.35)',
}: {
  src: string;
  width: number;
  height: number;
  /** 흰 띠에서 잘리는 그림(StageCrop)은 그림자를 위로만 준다 — 아래로 번지면 흰 띠에 얼룩이 남는다 */
  shadow?: string;
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
      boxShadow: shadow,
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

/** 표지 줄의 한 장 크기 (2:3 판형) — 5장이 가운데에 모인다(0.8배, HJ 2026-11-27) */
export const ROW_COVER = { width: 160, height: 240 } as const;
const ROW_GAP = 16;

/**
 * 표지 줄 — 무대 바닥선에 붙여 가운데에 세운다.
 *
 * 5장보다 적으면 **있는 만큼만** 세운다. 빈 판형으로 칸을 채우던 때가 있었는데,
 * 카톡 썸네일에서 "이미지가 덜 불러와졌다"로 보였다(2026-10-07).
 * 가운데에 모으는 이유: 정사각형으로 잘려도 가운데 서너 장은 남는다.
 */
export const CoverRow = ({ covers }: { covers: readonly string[] }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      position: 'absolute',
      left: 0,
      width: '100%',
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

/** 홈 슬로건 — 다른 문구를 안 넘기면 이 두 줄이 선다 */
const HOME_SLOGAN = ['책장을 보면,', '그 사람이 보인다'] as const;

type BrandStageProps = {
  /** 흰 띠 한 줄 */
  cta: string;
  /**
   * 무대 위 큰 글자(줄마다 한 항목, 두 줄 권장). 소개·책 이야기처럼 자기 그림이 없는
   * 페이지가 홈과 다른 카드로 읽히게 바꿔 단다(2026-11-27). 한 줄은 띄어쓰기 포함 9자 안쪽.
   */
  slogan?: readonly string[];
};

/**
 * 브랜드 카드 — 표지가 없는 모든 경우의 기본 카드.
 * 홈·소개·로그인 등 루트 OG, 없는 사용자, 아직 책이 없는 책장, 비공개 기록이 쓴다.
 *
 * 그림은 **선반 위 책장**(BookShelf) — 홈·소개가 같은 그림이고 글자만 다르다
 * (HJ 2026-11-27 "디자인 같게, 텍스트만 다르게"). 예전 색 막대 책 무리는 막대그래프처럼 보여 뺐다.
 */
export const BrandStage = ({ cta, slogan = HOME_SLOGAN }: BrandStageProps) => (
  <StageCard cta={cta}>
    <StageSlogan lines={slogan} />
    <BookShelf />
  </StageCard>
);

/** 표지 한 장이 주인공인 카드의 표지 크기 (2:3) — 글 아래 가운데에 서고 흰 띠에서 잘린다 */
const FEATURE_COVER = { width: 208, height: 312 } as const;

/** 표지 윗변 — 위의 글(별점·한줄평 두 줄)과 겹치지 않는 높이 */
const FEATURE_COVER_TOP = 268;

/** 글 칸 폭 — 가운데 정렬이라 넉넉히 둔다. 줄 나눔은 글자 수(balancedWrap)로 정한다 */
export const FEATURE_COLUMN_WIDTH = 900;

type FeatureStageProps = {
  /** 표지 URL. 없으면 같은 크기의 빈 판형을 세운다 */
  cover: string | null;
  /** 표지 위 글(별점·한줄평·완독 수) — 무대 위 가운데에 쌓인다 */
  children: React.ReactNode;
};

/**
 * 글 + 표지 한 장 — 책 기록·도서 상세 카드의 무대.
 * 위 가운데에 글, 그 아래 가운데에 표지를 세우고 표지 아래쪽은 흰 띠에서 자른다.
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
        flexDirection: 'column',
        alignItems: 'center',
        position: 'absolute',
        left: (OG_SIZE.width - FEATURE_COLUMN_WIDTH) / 2,
        top: SLOGAN_TOP - 6,
        width: FEATURE_COLUMN_WIDTH,
        color: OG_COLORS.paper,
      }}
    >
      {children}
    </div>

    <StageCrop>
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: STAGE_CENTER - FEATURE_COVER.width / 2,
          top: FEATURE_COVER_TOP,
        }}
      >
        {cover ? (
          // 그림자 없음 — satori 는 흰 띠에서 그림자를 자르지 못한다(StageCrop 참조)
          <Cover src={cover} {...FEATURE_COVER} shadow='none' />
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
    </StageCrop>
  </div>
);

/** 제목 한 줄 폭(한글 글자 수)·줄 수 — 두 줄까지 고르게 나누고 넘치면 말줄임 */
const TITLE_LINE_WIDTH = 14;
const TITLE_LINES = 2;
const AUTHOR_MAX_WIDTH = 24;

type StageBookTitleProps = {
  title: string;
  author: string | null;
  /** 위 요소와의 간격 */
  marginTop?: number;
};

/**
 * 무대 위 책 제목·저자 — 표지 위에 다른 할 말이 없을 때만 쓴다.
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
      alignItems: 'center',
      marginTop,
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontSize: SLOGAN_SIZE,
        fontWeight: 800,
        letterSpacing: -1.2,
        lineHeight: 1.22,
      }}
    >
      {/* 부제(' - ' 뒤)는 버린다 — 카드에서는 본 제목만으로 충분하다 */}
      {balancedWrap(title.split(' - ')[0], TITLE_LINE_WIDTH, TITLE_LINES).map(
        (line) => (
          <div key={line} style={{ display: 'flex' }}>
            {line}
          </div>
        )
      )}
    </div>
    {author ? (
      <div
        style={{
          display: 'flex',
          marginTop: 10,
          fontSize: 26,
          color: STAGE_TEXT_SOFT,
        }}
      >
        {truncate(author, AUTHOR_MAX_WIDTH)}
      </div>
    ) : null}
  </div>
);

/**
 * 무대 크기의 창 — 안에 둔 그림을 무대 바닥선(흰 띠 경계)에서 자른다.
 *
 * 소개·새 소식·책 이야기·오늘의 문장 카드는 물건 하나를 세워 윗부분만 보여 준다
 * (HJ 2026-11-27 "흰 띠에서 잘리게"). 아래쪽이 잘려야 "더 있다"로 읽힌다.
 * ⚠️ satori 는 overflow 로 boxShadow·회전한 요소를 자르지 못한다 — 안쪽 그림엔 아래 그림자·회전 X.
 */
export const StageCrop = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: STAGE_HEIGHT,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

/** 큰 슬로건 — 무대 위 가운데. 모든 카드가 같은 자리·크기다 */
export const StageSlogan = ({ lines }: { lines: readonly string[] }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'absolute',
      left: 0,
      top: SLOGAN_TOP,
      width: '100%',
      fontSize: SLOGAN_SIZE,
      fontWeight: 800,
      color: OG_COLORS.paper,
      // 큰 글자는 자간을 좁혀야 단어가 한 덩어리로 읽힌다
      letterSpacing: -1.4,
      lineHeight: 1.22,
    }}
  >
    {/* satori 는 <br/> 을 못 다룬다 — 줄마다 div 로 쌓는다 */}
    {lines.map((line) => (
      <div key={line} style={{ display: 'flex' }}>
        {line}
      </div>
    ))}
  </div>
);
