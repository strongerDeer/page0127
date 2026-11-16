import { Cover, STAGE_BACKGROUND } from './StageCard';
import {
  PANEL_RADIUS,
  STORY_CONTENT_WIDTH,
  STORY_GUTTER,
  STORY_SAFE_Y,
  StoryFooter,
  StoryProfile,
} from './StoryCard';
import { OG_COLORS, truncate } from './theme';
import { wrapLines } from './wrapLines';

/**
 * 파랑·흰 면의 경계 — 서재·책 스토리보다 훨씬 위다. 주인공이 표지가 아니라 **문장**이라
 * 흰 면을 넓게 써서 긴 문장(200자)도 숨 쉴 자리를 준다. 위 면엔 프로필 줄만 있다.
 */
const PANEL_TOP = 560;

/**
 * 문장 글자 크기 — 짧으면 크게, 길면 작게 해서 더 많은 줄을 싣는다.
 * 문장 서랍의 한 줄은 최대 200자(QUOTE_MAX_LENGTH)라 가장 작은 단계에서 다 들어간다.
 */
const QUOTE_STEPS = [
  { size: 60, lines: 4 },
  { size: 50, lines: 7 },
  { size: 42, lines: 11 },
] as const;

/**
 * 한 줄 폭(한글 글자 수) — 본문 폭 ÷ 글자 크기.
 * 무게 500 의 한글은 한 글자가 글자 크기보다 조금 좁고(≈0.93em) 띄어쓰기는 textWidth 추정(0.55)보다
 * 훨씬 좁아서, 여유를 빼면 오른쪽이 크게 빈다. 그래서 4% 더 싣는다(렌더해서 맞춘 값).
 */
const lineWidth = (fontSize: number) =>
  Math.floor((STORY_CONTENT_WIDTH / fontSize) * 1.04 * 10) / 10;

/** 문장 → 크기와 줄. 줄 수 안에 들어가는 가장 큰 단계를 고르고, 마지막 단계는 넘치면 말줄임 */
export const toQuoteLines = (
  text: string
): { size: number; lines: string[] } => {
  for (const step of QUOTE_STEPS) {
    const lines = wrapLines(text, lineWidth(step.size), Infinity);
    if (lines.length <= step.lines) return { size: step.size, lines };
  }
  const last = QUOTE_STEPS[QUOTE_STEPS.length - 1];
  return {
    size: last.size,
    lines: wrapLines(text, lineWidth(last.size), last.lines),
  };
};

/** 프로필 줄의 높이 — 사진(112px)이 줄의 높이를 정한다(StoryProfile) */
const PROFILE_HEIGHT = 112;

/** 아래 책 줄의 작은 표지 (2:3) */
const MINI_COVER = { width: 104, height: 156 } as const;
const BOOK_TEXT_MAX_WIDTH = 22;

export type QuoteStoryCardProps = {
  photoUrl: string | null;
  name: string;
  /** 이미지 안에 적는 주소 — 인스타 스토리엔 링크를 바로 걸 수 없다 */
  address: string;
  /** 책에서 옮겨 적은 문장 */
  text: string;
  page: number | null;
  title: string;
  author: string | null;
  cover: string | null;
};

/**
 * 문장 카드 스토리 이미지 (1080×1920) — 책 상세 "내가 모은 문장"의 공유 버튼.
 *
 * 서재·책 스토리와 같은 틀(파란 무대 + 프로필 줄 → 흰 면 → 아래 한 줄)이고, 주인공이 문장이다.
 * 북스타그램에서 가장 많이 퍼지는 형식(책 속 한 문장)이라, 문장은 크게·얇게(500) 두고
 * 어느 책인지는 아래에 작게 — 제목만 굵게(키워드만 굵게).
 * 위아래 250px 은 인스타가 덮는 자리라 비워 둔다.
 */
export const QuoteStoryCard = ({
  photoUrl,
  name,
  address,
  text,
  page,
  title,
  author,
  cover,
}: QuoteStoryCardProps) => {
  const quote = toQuoteLines(text);
  const meta = [author, page ? `p. ${page}` : null].filter(Boolean).join(' · ');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundImage: STAGE_BACKGROUND,
      }}
    >
      {/* 흰 면 — 위 모서리를 둥글게 해 파란 무대 위로 올라온 카드처럼 */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: PANEL_TOP,
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: PANEL_RADIUS,
          borderTopRightRadius: PANEL_RADIUS,
          background: OG_COLORS.paper,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: `${STORY_SAFE_Y}px ${STORY_GUTTER}px ${STORY_SAFE_Y}px`,
        }}
      >
        <StoryProfile photoUrl={photoUrl} name={name} address={address} />

        {/* 흰 면 — 남은 칸의 한가운데에 문장 + 책 한 덩어리 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            // 프로필 줄 아래부터가 아니라 흰 면 안쪽부터 — 면 위 여백(64px)을 두고 시작한다
            marginTop: PANEL_TOP + 64 - STORY_SAFE_Y - PROFILE_HEIGHT,
            color: OG_COLORS.ink,
          }}
        >
          {/* 여는 따옴표 하나 — 문장이 시작된다는 표시. 닫는 따옴표는 두지 않는다(카드가 덜 시끄럽다) */}
          <div
            style={{
              display: 'flex',
              height: 96,
              fontSize: 180,
              fontWeight: 800,
              lineHeight: 1,
              color: OG_COLORS.brand,
            }}
          >
            “
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 24,
              fontSize: quote.size,
              fontWeight: 500,
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

          {/* 어느 책의 문장인지 — 짧은 파란 선 아래 작은 표지와 제목 */}
          <div
            style={{
              display: 'flex',
              width: 72,
              height: 6,
              marginTop: 64,
              borderRadius: 3,
              background: OG_COLORS.brand,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 40 }}>
            {cover && <Cover src={cover} {...MINI_COVER} />}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginLeft: cover ? 32 : 0,
              }}
            >
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 800 }}>
                {truncate(title, BOOK_TEXT_MAX_WIDTH)}
              </div>
              {meta && (
                <div
                  style={{
                    display: 'flex',
                    marginTop: 8,
                    fontSize: 30,
                    fontWeight: 500,
                    color: OG_COLORS.inkSoft,
                  }}
                >
                  {truncate(meta, BOOK_TEXT_MAX_WIDTH + 4)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StoryFooter />
    </div>
  );
};
