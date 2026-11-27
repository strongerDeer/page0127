import { toQuoteLines } from './QuoteStoryCard';
import { STORY_GUTTER, STORY_SAFE_Y, StoryFooter } from './StoryCard';
import { truncate } from './theme';

/**
 * 오늘의 문장 결과 카드 색 — /sentence 결과 화면의 크림 종이(SentenceBook.module.css)와 같은 값.
 * 이미지는 테마와 무관한 그림이라 라이트 값으로 고정한다.
 */
const SENTENCE_COLORS = {
  cream: '#fbf3e6',
  ink: '#14294e',
  /** 머리글·출처 — 종이 위의 옅은 갈색 */
  muted: '#8a7a5c',
  /** 독서운 상자 */
  box: '#fffefb',
  boxLine: '#e6dcc6',
} as const;

/** 점수 구간 색 — 결과 화면 원형 게이지와 같다(90↑ 파랑 · 80대 민트 · 70대 보라) */
const toneColor = (score: number) =>
  score >= 90 ? '#2d78db' : score >= 80 ? '#14b8a6' : '#7a5cf0';

const SOURCE_MAX_WIDTH = 30;

/**
 * 당근 — features/daily-sentence/ui/CarrotSvg 의 평면 그림을 옮겨 왔다.
 * shared 레이어는 features 를 import 할 수 없고, satori 는 className 이 아니라 width/height 로 크기를 잡는다.
 * 홈은 장식이라 빼고 잎 셋 + 몸통 + 광 한 줄만.
 */
const Carrot = ({ height }: { height: number }) => (
  <svg width={(height * 60) / 98} height={height} viewBox='0 0 60 98'>
    <rect
      x='11'
      y='11'
      width='18'
      height='29'
      rx='9'
      transform='rotate(-12 20 38)'
      fill='#2f8f4e'
    />
    <rect
      x='31'
      y='11'
      width='18'
      height='29'
      rx='9'
      transform='rotate(12 40 38)'
      fill='#2f8f4e'
    />
    <rect x='21' y='5' width='18' height='35' rx='9' fill='#38a05a' />
    <path
      d='M30 30 C49 30 57 38 57 51 C57 68 46 82 38 89 C34 92.5 26 92.5 22 89 C14 82 3 68 3 51 C3 38 11 30 30 30 Z'
      fill='#f2862b'
    />
    <path
      d='M14 41 C16 37.5 19 35.5 23 35'
      stroke='#ffffff'
      strokeWidth='2.6'
      fill='none'
      strokeLinecap='round'
      opacity='0.4'
    />
  </svg>
);

export type SentenceStoryCardProps = {
  /** 머리글 날짜 ("11월 27일") */
  dateLabel: string;
  text: string;
  /** 출처 한 줄 — 《책》 · 저자 · 옮긴이 · p. (formatSentenceSource) */
  source: string;
  score: number;
  /** 점수에 맞춘 한 줄 (commentFor) */
  comment: string;
};

/**
 * 오늘의 문장 스토리 이미지 (1080×1920) — /sentence 결과 화면의 공유 버튼(HJ B안, 2026-11-27).
 *
 * 결과 화면의 크림 종이를 그대로 옮긴다: 위 머리글(날짜 · page0127.) → 가운데 문장 + 출처 →
 * 당근 독서운 상자 → 맨 아래 "page0127.com/sentence 에서 나도 뽑기".
 * 문장 카드(A)와 달리 당근·점수를 보여 줘서 받는 사람이 "나도 뽑아 볼래"가 되게 한다.
 * 누구의 결과인지(프로필)는 없다 — 비회원도 공유하는 화면이라 그릴 사람이 없다.
 * 위아래 250px 은 인스타가 덮는 자리라 비워 둔다.
 */
export const SentenceStoryCard = ({
  dateLabel,
  text,
  source,
  score,
  comment,
}: SentenceStoryCardProps) => {
  // 문장 안 줄바꿈은 결과 화면에서도 한 문단으로 읽힌다 → 공백으로 잇고 이미지 폭에 맞춰 다시 나눈다
  const quote = toQuoteLines(text.replace(/\s*\n\s*/g, ' '));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        padding: `${STORY_SAFE_Y}px ${STORY_GUTTER}px ${STORY_SAFE_Y}px`,
        background: SENTENCE_COLORS.cream,
        color: SENTENCE_COLORS.ink,
      }}
    >
      {/* 머리글 — 책의 쪽 머리처럼 작게 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 32,
          fontWeight: 500,
          color: SENTENCE_COLORS.muted,
        }}
      >
        <div style={{ display: 'flex' }}>{`${dateLabel} · 오늘의 문장`}</div>
        <div style={{ display: 'flex', fontWeight: 800 }}>page0127.</div>
      </div>

      {/* 가운데 — 문장 + 출처 + 독서운 한 덩어리 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: quote.size,
            fontWeight: 500,
            lineHeight: 1.6,
            letterSpacing: -1,
          }}
        >
          {quote.lines.map((line, i) => (
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
            color: SENTENCE_COLORS.muted,
          }}
        >
          {truncate(source, SOURCE_MAX_WIDTH)}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 72,
            padding: '36px 44px',
            borderRadius: 28,
            background: SENTENCE_COLORS.box,
            border: `2px solid ${SENTENCE_COLORS.boxLine}`,
          }}
        >
          <Carrot height={124} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginLeft: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                fontWeight: 500,
                color: SENTENCE_COLORS.muted,
              }}
            >
              오늘의 독서운
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 92,
                fontWeight: 800,
                lineHeight: 1.05,
                color: toneColor(score),
              }}
            >
              {score}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flex: 1,
              marginLeft: 36,
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            {comment}
          </div>
        </div>
      </div>

      <StoryFooter address='page0127.com/sentence' cta='에서 나도 뽑기' />
    </div>
  );
};
