import { RatingStars } from './RatingStars';
import { Cover, STAGE_BACKGROUND } from './StageCard';
import {
  PANEL_RADIUS,
  STORY_CONTENT_WIDTH,
  STORY_GUTTER,
  STORY_SAFE_Y,
  StoryProfile,
} from './StoryCard';
import { OG_COLORS, truncate } from './theme';
import { wrapLines } from './wrapLines';

/** 표지 한 장 (2:3) — 이미지의 주인공이다. 파란 면과 흰 면의 경계에 걸쳐 세운다 */
const COVER = { width: 400, height: 600 } as const;
/**
 * 파랑·흰 면의 경계 — 서재 스토리(StoryCard)보다 위다. 표지 아래쪽이 흰 면에 걸쳐
 * "책이 카드 위에 놓인" 모양이 되고, 아래 흰 면에 한줄평이 앉을 자리가 넉넉해진다.
 */
const PANEL_TOP = 820;

/**
 * 한줄평 글자 크기 — 짧으면 크게, 길면 작게 해서 더 많은 줄을 싣는다.
 * 줄 폭은 본문 폭 ÷ 글자 크기에서 따옴표 두 개 자리를 뺀 값(한글 글자 수 기준).
 */
const REVIEW_LARGE = { size: 60, lines: 3 } as const;
const REVIEW_SMALL = { size: 46, lines: 5 } as const;
const lineWidth = (fontSize: number) =>
  Math.floor((STORY_CONTENT_WIDTH / fontSize) * 10) / 10 - 1.2;

/** 한줄평이 없을 때 제목을 크게 — 두 줄까지 */
const TITLE_SIZE = 64;
const TITLE_LINES = 2;
const BYLINE_MAX_WIDTH = 30;

export type BookStoryCardProps = {
  photoUrl: string | null;
  name: string;
  /** 이미지 안에 적는 주소 — 인스타 스토리엔 링크를 바로 걸 수 없다 */
  address: string;
  title: string;
  author: string | null;
  cover: string | null;
  /** 5점 만점 — 매기지 않았으면 null(빈 별 5개는 0점으로 읽힌다) */
  score: number | null;
  isLifeBook: boolean;
  /** 한줄평 — 없으면 null */
  review: string | null;
};

/** 표지가 없는 책 — 남색 판형 위에 제목. 자리가 비면 이미지의 중심이 사라진다 */
const PlainCover = ({ title }: { title: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      width: COVER.width,
      height: COVER.height,
      padding: 40,
      borderRadius: 8,
      background: OG_COLORS.ink,
      color: '#ffffff',
      fontSize: 44,
      fontWeight: 800,
      lineHeight: 1.3,
      boxShadow: '0 12px 28px rgba(4, 30, 80, 0.35)',
    }}
  >
    {wrapLines(title, 7, 5).map((line, i) => (
      <div key={i} style={{ display: 'flex' }}>
        {line}
      </div>
    ))}
  </div>
);

/** 별점·인생책 한 줄 — 둘 다 없으면 그리지 않는다 */
const BadgeRow = ({
  score,
  isLifeBook,
}: {
  score: number | null;
  isLifeBook: boolean;
}) => {
  if (score === null && !isLifeBook) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {score !== null && <RatingStars score={score} size={52} />}
      {isLifeBook && (
        <div
          style={{
            display: 'flex',
            marginLeft: score !== null ? 22 : 0,
            padding: '8px 26px',
            borderRadius: 999,
            // brand/accent — 이미지에서 유일한 비(非)블루라 "특별하다"가 색으로 읽힌다
            background: OG_COLORS.mint,
            color: OG_COLORS.ink,
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          인생책
        </div>
      )}
    </div>
  );
};

/**
 * 책 한 권 스토리 이미지 (1080×1920) — 책 기록 페이지 공유 시트의 "이미지 공유하기".
 *
 * 서재 스토리(StoryCard)와 같은 문법이다: 위는 파란 무대 + 프로필 줄, 아래는 흰 면.
 * 다른 점은 주인공이 책장 대신 **표지 한 장과 그 사람이 쓴 문장**이라는 것.
 * 표지를 두 면의 경계에 걸쳐 세우고, 흰 면에 별점·인생책 → 한줄평 → 제목·저자 순으로 놓는다.
 * 한줄평이 없으면 제목을 크게 쓴다(무대가 비지 않게 — 공유 카드 opengraph-image 와 같은 규칙).
 * 위아래 250px 은 인스타가 덮는 자리라 비워 둔다.
 */
export const BookStoryCard = ({
  photoUrl,
  name,
  address,
  title,
  author,
  cover,
  score,
  isLifeBook,
  review,
}: BookStoryCardProps) => {
  const hasBadgeRow = score !== null || isLifeBook;

  // 짧은 한줄평은 크게. 큰 글자로 세 줄을 넘으면 작은 글자로 다섯 줄까지
  const largeLines = review
    ? wrapLines(review, lineWidth(REVIEW_LARGE.size), Infinity)
    : [];
  const reviewStyle =
    largeLines.length <= REVIEW_LARGE.lines ? REVIEW_LARGE : REVIEW_SMALL;
  const reviewLines = review
    ? wrapLines(review, lineWidth(reviewStyle.size), reviewStyle.lines)
    : [];

  const byline = author ? `${title} · ${author}` : title;

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
          style={{ display: 'flex', justifyContent: 'center', marginTop: 64 }}
        >
          {cover ? (
            <Cover src={cover} {...COVER} />
          ) : (
            <PlainCover title={title} />
          )}
        </div>

        {/* 아래 흰 면 — 남은 칸의 한가운데에 한 덩어리로 */}
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
          <BadgeRow score={score} isLifeBook={isLifeBook} />

          {/* 조각(<>)은 쓰지 않는다 — satori 는 조각 안의 형제를 가로로 늘어놓았다 */}
          {reviewLines.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginTop: hasBadgeRow ? 36 : 0,
                  fontSize: reviewStyle.size,
                  fontWeight: 700,
                  lineHeight: 1.4,
                  letterSpacing: -1,
                }}
              >
                {reviewLines.map((line, i) => (
                  <div key={i} style={{ display: 'flex' }}>
                    {/* 따옴표는 첫 줄 앞·마지막 줄 끝에만 — 사용자가 쓴 문장이라는 표시 */}
                    {`${i === 0 ? '“' : ''}${line}${
                      i === reviewLines.length - 1 ? '”' : ''
                    }`}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 32,
                  fontSize: 30,
                  fontWeight: 500,
                  color: OG_COLORS.inkSoft,
                }}
              >
                {truncate(byline, BYLINE_MAX_WIDTH)}
              </div>
            </div>
          ) : (
            // 한줄평이 없으면 흰 면이 비므로 그때만 제목을 크게 쓴다
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginTop: hasBadgeRow ? 36 : 0,
                  fontSize: TITLE_SIZE,
                  fontWeight: 800,
                  lineHeight: 1.25,
                  letterSpacing: -1.5,
                }}
              >
                {wrapLines(title, lineWidth(TITLE_SIZE), TITLE_LINES).map(
                  (line, i) => (
                    <div key={i} style={{ display: 'flex' }}>
                      {line}
                    </div>
                  )
                )}
              </div>
              {author && (
                <div
                  style={{
                    display: 'flex',
                    marginTop: 20,
                    fontSize: 34,
                    fontWeight: 500,
                    color: OG_COLORS.inkSoft,
                  }}
                >
                  {truncate(author, BYLINE_MAX_WIDTH)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
