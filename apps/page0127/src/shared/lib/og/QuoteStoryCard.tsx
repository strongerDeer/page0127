import { Cover, STAGE_BACKGROUND } from './StageCard';
import {
  STORY_CONTENT_WIDTH,
  STORY_GUTTER,
  STORY_SAFE_Y,
  StoryFooter,
  StoryProfile,
} from './StoryCard';
import { STORY_SIZE, truncate } from './theme';
import { wrapLines } from './wrapLines';

/**
 * 문장 글자 크기 — 짧으면 크게, 길면 작게 해서 더 많은 줄을 싣는다.
 * 문장 서랍의 한 줄은 최대 200자(QUOTE_MAX_LENGTH)라 가장 작은 단계에서 다 들어간다.
 */
const QUOTE_STEPS = [
  { size: 64, lines: 5 },
  { size: 52, lines: 8 },
  { size: 42, lines: 12 },
] as const;

/**
 * 한 줄 폭(한글 글자 수) — 본문 폭 ÷ 글자 크기.
 * 띄어쓰기는 실제로 textWidth 추정(0.55)보다 훨씬 좁아서, 여유를 빼면 오른쪽이 크게 빈다.
 * 그래서 여유 없이 본문 폭을 그대로 쓴다(무게 700 으로 렌더해서 맞춘 값).
 */
const lineWidth = (fontSize: number) =>
  Math.floor((STORY_CONTENT_WIDTH / fontSize) * 10) / 10;

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
 * 표지 위에 씌우는 남색 막 — 위는 조금 옅게(표지 그림이 비쳐 "이 책"으로 읽히게),
 * 아래로 갈수록 짙게(흰 글자가 어떤 표지 위에서도 읽히게). 남색은 브랜드 파랑의 짙은 쪽.
 */
const COVER_SCRIM =
  'linear-gradient(180deg, rgba(12, 44, 104, 0.78) 0%, rgba(12, 44, 104, 0.86) 45%, rgba(10, 32, 78, 0.95) 100%)';
/** 여는 따옴표 — 남색 위에서 브랜드 파랑의 옅은 쪽(blue/300) */
const QUOTE_MARK_COLOR = '#93c0fb';
const TEXT_SOFT = 'rgba(255, 255, 255, 0.8)';

/**
 * 문장 카드 스토리 이미지 (1080×1920) — 책 상세 "내가 모은 문장"의 공유 버튼.
 *
 * 그 책의 **표지를 화면 가득** 깔고 남색 막을 씌운 뒤, 흰 글자로 문장을 올린다.
 * 책마다 표지 색이 달라 카드마다 분위기가 달라지고, 피드에서 "어느 책의 문장"인지 한눈에 보인다
 * (북스타그램 문장 카드 문법, HJ B안 2026-11-16). 위 프로필 줄·아래 한 줄은 다른 스토리와 같다.
 * 표지가 없거나 받지 못하면 파란 무대(STAGE_BACKGROUND)가 그대로 바탕이 된다.
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
      {/* 표지를 화면 가득 — 비율이 달라도 잘라서 채운다(object-fit: cover) */}
      {cover && (
        // satori 는 next/image 를 렌더하지 못한다 — 이 파일은 브라우저로 나가지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=''
          width={STORY_SIZE.width}
          height={STORY_SIZE.height}
          style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
        />
      )}
      {/* 막은 자식이 없어 크기를 직접 준다 — satori 는 inset 을 모른다 */}
      {cover && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: STORY_SIZE.width,
            height: STORY_SIZE.height,
            backgroundImage: COVER_SCRIM,
          }}
        />
      )}

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
          color: '#ffffff',
        }}
      >
        <StoryProfile photoUrl={photoUrl} name={name} address={address} />

        {/* 남은 칸의 한가운데에 문장 + 책 한 덩어리 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          {/* 여는 따옴표 하나 — 문장이 시작된다는 표시. 닫는 따옴표는 두지 않는다(카드가 덜 시끄럽다) */}
          <div
            style={{
              display: 'flex',
              height: 110,
              fontSize: 200,
              fontWeight: 800,
              lineHeight: 1,
              color: QUOTE_MARK_COLOR,
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
              fontWeight: 700,
              lineHeight: 1.45,
              letterSpacing: -1.5,
            }}
          >
            {quote.lines.map((line, i) => (
              <div key={i} style={{ display: 'flex' }}>
                {line}
              </div>
            ))}
          </div>

          {/* 어느 책의 문장인지 — 작은 표지와 제목(굵게)·저자·쪽수 */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 72 }}>
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
                    color: TEXT_SOFT,
                  }}
                >
                  {truncate(meta, BOOK_TEXT_MAX_WIDTH + 4)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StoryFooter tone='light' />
    </div>
  );
};
