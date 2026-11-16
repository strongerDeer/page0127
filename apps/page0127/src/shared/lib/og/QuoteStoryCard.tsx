import { PlainCover } from './BookStoryCard';
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
 * 문장 글자 크기 — 짧으면 크게, 길면 작게 해서 더 많은 줄을 싣는다.
 * 문장 서랍의 한 줄은 최대 200자(QUOTE_MAX_LENGTH)라 가장 작은 단계에서 다 들어간다.
 * 마지막 단계(긴 문장)에서는 표지를 조금 줄여 흰 면에 자리를 낸다(COVER_FOR_LONG).
 */
const QUOTE_STEPS = [
  { size: 52, lines: 4 },
  { size: 44, lines: 6 },
  { size: 38, lines: 10 },
] as const;

/**
 * 한 줄 폭(한글 글자 수) — 본문 폭 ÷ 글자 크기.
 * 무게 500 의 한글은 한 글자가 글자 크기보다 조금 좁고 띄어쓰기는 textWidth 추정(0.55)보다
 * 훨씬 좁아서, 여유를 빼면 오른쪽이 크게 빈다. 그래서 4% 더 싣는다(렌더해서 맞춘 값).
 * 따옴표 두 개(첫 줄 앞·마지막 줄 끝) 자리는 뺀다.
 */
const lineWidth = (fontSize: number) =>
  Math.floor((STORY_CONTENT_WIDTH / fontSize) * 1.04 * 10) / 10 - 1;

/** 문장 → 크기와 줄. 줄 수 안에 들어가는 가장 큰 단계를 고르고, 마지막 단계는 넘치면 말줄임 */
export const toQuoteLines = (
  text: string
): { size: number; lines: string[]; long: boolean } => {
  for (const [i, step] of QUOTE_STEPS.entries()) {
    const lines = wrapLines(text, lineWidth(step.size), Infinity);
    if (lines.length <= step.lines) {
      return { size: step.size, lines, long: i === QUOTE_STEPS.length - 1 };
    }
  }
  const last = QUOTE_STEPS[QUOTE_STEPS.length - 1];
  return {
    size: last.size,
    lines: wrapLines(text, lineWidth(last.size), last.lines),
    long: true,
  };
};

/**
 * 표지 (2:3) — 이미지의 주인공. 책 기록 스토리(400×600)와 같은 크기로 세운다.
 * 긴 문장은 흰 면에 열 줄까지 들어가야 해서 표지를 조금 줄인다.
 */
const COVER = { width: 400, height: 600 } as const;
const COVER_FOR_LONG = { width: 320, height: 480 } as const;

/**
 * 프로필 줄과 표지 사이 — 표지가 프로필에 붙으면 둘 다 작아 보인다.
 * 넉넉히 띄워 표지가 무대 한가운데에 "놓인" 것처럼 보이게 한다(HJ, 2026-11-16).
 */
const PROFILE_GAP = 112;
/** 표지 아래쪽이 흰 면에 이만큼 걸친다 — "책이 카드 위에 놓인" 모양 */
const COVER_OVERLAP = 0.32;
/** 프로필 줄의 높이 — 사진(112px)이 줄의 높이를 정한다(StoryProfile) */
const PROFILE_HEIGHT = 112;
const TITLE_MAX_WIDTH = 20;
const META_MAX_WIDTH = 16;

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
 * 책 기록 스토리(BookStoryCard)와 같은 문법이다(HJ A안, 2026-11-16): 위는 파란 무대 + 프로필 줄,
 * **큰 표지**가 파랑·흰 면 경계에 걸쳐 서고, 아래 흰 면 가운데에 문장. 그 아래 제목(굵게)·저자·쪽수.
 * 문장은 얇게(500) — 사용자가 고른 문장을 담담하게, 키워드(제목)만 굵게.
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
  const coverSize = quote.long ? COVER_FOR_LONG : COVER;
  const coverTop = STORY_SAFE_Y + PROFILE_HEIGHT + PROFILE_GAP;
  // 경계는 표지 높이의 위쪽 68% 지점 — 표지 크기가 바뀌어도 걸치는 비율이 같다
  const panelTop = Math.round(
    coverTop + coverSize.height * (1 - COVER_OVERLAP)
  );
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
          top: panelTop,
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: PANEL_RADIUS,
          borderTopRightRadius: PANEL_RADIUS,
          background: OG_COLORS.paper,
        }}
      />

      {/* 내용 — 면 위에 한 줄로 쌓는다(satori 는 뒤에 그린 것이 위에 온다) */}
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

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: PROFILE_GAP,
          }}
        >
          {cover ? (
            <Cover src={cover} {...coverSize} />
          ) : (
            <PlainCover title={title} {...coverSize} />
          )}
        </div>

        {/* 아래 흰 면 — 남은 칸의 한가운데에 문장 + 책 정보 한 덩어리 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: OG_COLORS.ink,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontSize: quote.size,
              fontWeight: 500,
              lineHeight: 1.5,
              letterSpacing: -1,
            }}
          >
            {quote.lines.map((line, i) => (
              <div key={i} style={{ display: 'flex' }}>
                {/* 따옴표는 첫 줄 앞·마지막 줄 끝에만 — 책에서 옮긴 문장이라는 표시 */}
                {`${i === 0 ? '“' : ''}${line}${
                  i === quote.lines.length - 1 ? '”' : ''
                }`}
              </div>
            ))}
          </div>

          {/* 어느 책의 문장인지 — 제목만 굵게, 저자·쪽수는 옅게 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              marginTop: 32,
              fontSize: 30,
            }}
          >
            <div style={{ display: 'flex', fontWeight: 800 }}>
              {truncate(title, TITLE_MAX_WIDTH)}
            </div>
            {meta && (
              <div
                style={{
                  display: 'flex',
                  marginLeft: 14,
                  fontWeight: 500,
                  color: OG_COLORS.inkSoft,
                }}
              >
                {truncate(meta, META_MAX_WIDTH)}
              </div>
            )}
          </div>
        </div>
      </div>

      <StoryFooter />
    </div>
  );
};
