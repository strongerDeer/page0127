import { toQuoteLines } from './QuoteStoryCard';
import { STORY_GUTTER, STORY_SAFE_Y, StoryFooter } from './StoryCard';
import { truncate } from './theme';
import { wrapLines } from './wrapLines';

/**
 * 오늘의 문장 결과 화면(SentenceBook 의 .leaf) 색 — SentenceBook.module.css 라이트 값과 같다.
 * 이미지는 테마와 무관한 그림이라 라이트 값으로 고정한다.
 */
const SENTENCE_COLORS = {
  page: '#f3f5f9',
  ink: '#14294e',
  sub: '#5b6b85',
  line: '#dbe3ee',
  blue: '#2d78db',
  chip: '#ffffff',
} as const;

/** 점수 구간 색 — 결과 화면 원형 게이지와 같다(90↑ 파랑 · 80대 민트 · 70대 보라) */
const toneColor = (score: number) =>
  score >= 90 ? '#2d78db' : score >= 80 ? '#14b8a6' : '#7a5cf0';

const SOURCE_MAX_WIDTH = 30;

/** 원형 게이지 — 화면의 ScoreArc 를 2.5배로(56px → 140px). 12시에서 시계 방향으로 찬다 */
const RING = { size: 140, radius: 60, stroke: 12 } as const;

const ScoreRing = ({ score }: { score: number }) => {
  const c = RING.size / 2;
  const length = 2 * Math.PI * RING.radius;
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: RING.size,
        height: RING.size,
        flexShrink: 0,
      }}
    >
      <svg
        width={RING.size}
        height={RING.size}
        viewBox={`0 0 ${RING.size} ${RING.size}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <circle
          cx={c}
          cy={c}
          r={RING.radius}
          fill='none'
          stroke={SENTENCE_COLORS.line}
          strokeWidth={RING.stroke}
        />
        <circle
          cx={c}
          cy={c}
          r={RING.radius}
          fill='none'
          stroke={toneColor(score)}
          strokeWidth={RING.stroke}
          strokeLinecap='round'
          strokeDasharray={`${length}`}
          strokeDashoffset={length * (1 - score / 100)}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <div style={{ display: 'flex', fontSize: 46, fontWeight: 800 }}>
        {score}
      </div>
    </div>
  );
};

/**
 * 문장 줄 나누기 — 화면처럼 가운데 정렬 + 줄 폭을 고르게(text-wrap: balance).
 * 줄 수를 정한 뒤 그 줄 수로 들어가는 가장 좁은 폭을 찾아 다시 나눈다 — 마지막 줄만 짧게 남지 않는다.
 */
const toBalancedQuote = (text: string) => {
  const quote = toQuoteLines(text);
  if (quote.lines.length <= 1) return quote;
  const full = quote.lines.join(' ');
  let lines = quote.lines;
  for (let width = 4; width < 40; width += 0.5) {
    const candidate = wrapLines(full, width, Infinity);
    if (candidate.length <= quote.lines.length) {
      lines = candidate;
      break;
    }
  }
  return { ...quote, lines };
};

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
 * 결과 화면(SentenceBook 결과 쪽)을 그대로 옮긴다(HJ 11/27 "기존 오늘의 문장 디자인 따르기 · 가운데 정렬"):
 * 위 머리글(page0127. 오늘의 문장 | 날짜 · 오늘의 독서운) → 가운데 "오늘의 한 줄" + 굵은 문장 + 출처 →
 * 원형 게이지 독서운 → 맨 아래 "page0127.com/sentence 에서 나도 뽑기".
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
  const quote = toBalancedQuote(text.replace(/\s*\n\s*/g, ' '));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        padding: `${STORY_SAFE_Y}px ${STORY_GUTTER}px ${STORY_SAFE_Y}px`,
        background: SENTENCE_COLORS.page,
        color: SENTENCE_COLORS.ink,
      }}
    >
      {/* 머리글 — 화면의 .runhead: 왼쪽 파랑, 오른쪽 옅게 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 30,
          fontWeight: 500,
        }}
      >
        <div style={{ display: 'flex', color: SENTENCE_COLORS.blue }}>
          page0127. 오늘의 문장
        </div>
        <div
          style={{ display: 'flex', color: SENTENCE_COLORS.sub }}
        >{`${dateLabel} · 오늘의 독서운`}</div>
      </div>

      {/* 가운데 — 화면의 .body: 모두 가운데 정렬 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          textAlign: 'center',
        }}
      >
        {/* "오늘의 한 줄" + 오른쪽 짧은 선 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 30,
            fontWeight: 500,
            color: SENTENCE_COLORS.sub,
          }}
        >
          오늘의 한 줄
          <div
            style={{
              display: 'flex',
              width: 80,
              marginLeft: 22,
              borderTop: `2px solid ${SENTENCE_COLORS.line}`,
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 44,
            fontSize: quote.size,
            fontWeight: 800,
            lineHeight: 1.5,
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
            marginTop: 40,
            fontSize: 30,
            fontWeight: 500,
            color: SENTENCE_COLORS.sub,
          }}
        >
          {`— ${truncate(source, SOURCE_MAX_WIDTH)}`}
        </div>

        {/* 독서운 — 화면의 .fortune: 흰 알약 안에 원형 게이지 + 두 줄 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 64,
            padding: '22px 52px 22px 22px',
            borderRadius: 999,
            background: SENTENCE_COLORS.chip,
            border: `2px solid ${SENTENCE_COLORS.line}`,
          }}
        >
          <ScoreRing score={score} />
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
                fontSize: 27,
                fontWeight: 500,
                color: SENTENCE_COLORS.sub,
              }}
            >
              오늘의 독서운
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 6,
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              {comment}
            </div>
          </div>
        </div>
      </div>

      <StoryFooter address='page0127.com/sentence' cta='에서 나도 뽑기' />
    </div>
  );
};
