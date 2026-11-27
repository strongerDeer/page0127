import { STORY_GUTTER, STORY_SAFE_Y, StoryFooter } from './StoryCard';
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
 * 연말 응원 카드 스토리 이미지 (1080×1920) — 시안 v3 를 이미지로.
 *
 * 파란 무대 + 맨 아래 빨강·흰 띠 + 종이 카드. 무늬는 넣지 않는다 — 인스타가 이미지를 한 번 더
 * 압축하면 옅은 선 무늬는 얼룩처럼 보인다. 위아래 250px 안전 영역은 다른 스토리 카드와 같다.
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
        padding: `${STORY_SAFE_Y}px ${STORY_GUTTER}px ${STORY_SAFE_Y + 80}px`,
        background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_DEEP} 100%)`,
        color: '#ffffff',
        fontFamily: 'Pretendard',
      }}
    >
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
          marginTop: 64,
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
