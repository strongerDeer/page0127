import {
  STORY_GUTTER,
  STORY_HEADER_DROP,
  STORY_HEADER_TOP,
  STORY_SAFE_Y,
  StoryFooter,
} from './StoryCard';
import { STORY_SIZE } from './theme';

/** 연말 응원 카드의 명조 — 스토리 라우트가 loadGoogleFont 로 받아 넘긴다 */
export const CHEER_SERIF_FAMILY = 'Gowun Batang';

const BLUE = '#1e69cb';
const BLUE_DEEP = '#0b4fae';
const RED = '#d64554';
const PAPER = '#fffdf8';
const INK = '#1b2333';
const SOFT = '#55627a';
const MINT = '#6ee7b7';

/**
 * 문장 글자 크기 — 가장 긴 줄 길이로 고른다. 카드 안쪽 폭(≈776px)에 한 줄이 되도록.
 * 넘쳐도 keep-all 로 어절 단위로 접히므로 깨지지는 않는다.
 */
export const toCheerQuoteSize = (lines: string[]): number => {
  const longest = Math.max(...lines.map((line) => line.length));
  if (longest <= 12) return 60;
  if (longest <= 16) return 50;
  if (longest <= 20) return 42;
  // 요즘 책 문장은 줄이 길다 — 어절 단위로 접혀도 카드 안에 들어오게 한 단계 더 줄인다
  const total = lines.reduce((sum, line) => sum + line.length, 0);
  if (longest > 30 || total > 90) return 34;
  return 38;
};

export type CheerStoryCardProps = {
  year: number;
  name: string;
  firstLine: string;
  lines: string[];
  /** 출처 한 줄 — 「작가, 『책』 「글」 · 옮긴이 옮김」 */
  source: string;
  /** 명조 글꼴을 받았는가 — 못 받았으면 Pretendard 로 그린다 */
  serif: boolean;
};

/**
 * 흰 선 무늬 한 장(1080×1920) — 화면의 96px 무늬 칸을 2.2배로 키워 깐다.
 * satori 는 CSS mask 를 못 그려서, 가림(위는 투명 → 아래로 보이게)까지 SVG 안에서 한다.
 */
const PATTERN_TILE =
  "<path d='M20 10v16M12 18h16M14.5 12.5l11 11M25.5 12.5l-11 11'/>" +
  "<path d='M70 52l9 15H61z' stroke-linejoin='round'/>" +
  "<path d='M70 67v4'/><path d='M76 14v8M72 18h8'/><path d='M26 66v8M22 70h8'/>" +
  "<circle cx='50' cy='32' r='1.4' fill='#fff'/><circle cx='8' cy='46' r='1.2' fill='#fff'/>" +
  "<circle cx='46' cy='86' r='1.4' fill='#fff'/><circle cx='90' cy='88' r='1.2' fill='#fff'/>";

/** 무늬 한 장을 크기·배율에 맞춰 만든다 — 스토리(1080×1920)·링크 미리보기(1200×630)가 같이 쓴다 */
export const toCheerPatternSrc = (
  width: number,
  height: number,
  scale: number
): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>` +
      `<defs><pattern id='p' width='96' height='96' patternUnits='userSpaceOnUse' patternTransform='scale(${scale})'>` +
      `<g fill='none' stroke='#fff' stroke-width='1.6' stroke-linecap='round'>${PATTERN_TILE}</g></pattern>` +
      "<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0.24' stop-color='#fff' stop-opacity='0'/><stop offset='0.5' stop-color='#fff' stop-opacity='1'/>" +
      "</linearGradient><mask id='m'><rect width='100%' height='100%' fill='url(#g)'/></mask></defs>" +
      "<rect width='100%' height='100%' fill='url(#p)' mask='url(#m)' opacity='0.15'/></svg>"
  )}`;

export const CHEER_PATTERN_SRC = toCheerPatternSrc(
  STORY_SIZE.width,
  STORY_SIZE.height,
  2.2
);

/**
 * 연말 응원 카드 스토리 이미지 (1080×1920) — 시안 v3 를 이미지로.
 *
 * 파란 무대 + 은은한 흰 선 무늬 + 맨 아래 빨강·흰 띠 + 종이 카드. 위아래 250px 안전 영역은 다른 스토리 카드와 같다.
 * 무늬는 화면(CheerScene.module.css .stage::before)과 같은 그림·같은 규칙이다 — 위 24% 는 비우고
 * 아래로 갈수록 보이게(HJ 시안 v3 확정, 11/27 "은은하게 배경 깔기로 했잖아"). 글자 뒤라 진하게 하지 않는다.
 */
export const CheerStoryCard = ({
  year,
  name,
  firstLine,
  lines,
  source,
  serif,
}: CheerStoryCardProps) => {
  const quoteSize = toCheerQuoteSize(lines);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: STORY_SIZE.width,
        height: STORY_SIZE.height,
        // 아래는 주소 줄(StoryFooter) 자리까지 비운다 — 카드는 남은 칸 가운데에 선다
        padding: `${STORY_HEADER_TOP}px ${STORY_GUTTER}px ${STORY_SAFE_Y + 80}px`,
        background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_DEEP} 100%)`,
        color: '#ffffff',
        fontFamily: 'Pretendard',
      }}
    >
      {/* 은은한 흰 선 무늬 — 맨 뒤에 깐다 */}
      {/* eslint-disable-next-line @next/next/no-img-element -- satori 는 img 만 그린다 */}
      <img
        src={CHEER_PATTERN_SRC}
        width={STORY_SIZE.width}
        height={STORY_SIZE.height}
        alt=''
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      {/* 윗줄 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 34,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.88)',
        }}
      >
        <div style={{ display: 'flex' }}>{year} 연말 선물</div>
        <div style={{ display: 'flex', fontWeight: 800, color: '#ffffff' }}>
          page0127<span style={{ color: MINT }}>.</span>
        </div>
      </div>

      {/* 제목 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 64 + STORY_HEADER_DROP,
          marginBottom: 72,
          fontSize: 76,
          fontWeight: 800,
          lineHeight: 1.3,
          letterSpacing: -1.5,
        }}
      >
        <div style={{ display: 'flex' }}>{year}년을 보낸</div>
        <div style={{ display: 'flex' }}>{name}님에게 온 응원</div>
      </div>

      {/* 종이 카드 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 'auto',
          marginBottom: 'auto',
          padding: '64px 64px 60px',
          borderRadius: 40,
          background: PAPER,
          color: INK,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: RED }}
        >
          올해의 응원
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 18,
            fontSize: 34,
            fontWeight: 500,
            lineHeight: 1.55,
            color: SOFT,
            wordBreak: 'keep-all',
          }}
        >
          {firstLine}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 56,
            fontFamily: serif ? CHEER_SERIF_FAMILY : 'Pretendard',
            fontSize: quoteSize,
            fontWeight: 700,
            lineHeight: 1.6,
            wordBreak: 'keep-all',
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex' }}>
              {line}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            fontSize: 30,
            fontWeight: 500,
            color: SOFT,
          }}
        >
          {source}
        </div>
      </div>

      <StoryFooter tone='light' />

      {/* 맨 아래 빨강·흰 띠 */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 24,
          background: `repeating-linear-gradient(90deg, ${RED} 0px, ${RED} 40px, #ffffff 40px, #ffffff 80px)`,
        }}
      />
    </div>
  );
};
