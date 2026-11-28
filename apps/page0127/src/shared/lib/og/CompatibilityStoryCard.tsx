import { balancedWrap, balanceLines } from './balanceLines';
import { STAGE_BACKGROUND } from './StageCard';
import {
  PANEL_RADIUS,
  STORY_CONTENT_WIDTH,
  STORY_GUTTER,
  STORY_HEADER_DROP,
  STORY_HEADER_TOP,
  STORY_SAFE_Y,
  StoryFooter,
} from './StoryCard';
import { OG_COLORS, truncate } from './theme';

/**
 * 파랑·흰 면의 경계 — 위 면엔 사진 줄과 타입 이름(최대 두 줄)뿐이라 서재 스토리(900)보다 위다.
 * 가장 긴 경우(이름 두 줄)가 ≈670px 에서 끝난다. 고정이라 누구의 케미든 같은 자리에 선다.
 */
const PANEL_TOP = 780;

const AVATAR = 132;
/** 두 사진이 겹치는 폭 — 둘이 나란히 붙어 "한 쌍"으로 읽힌다 */
const AVATAR_OVERLAP = 36;
const NAME_MAX_WIDTH = 9;

const HEADLINE_SIZE = 88;
const HEADLINE_LINE_WIDTH =
  Math.floor((STORY_CONTENT_WIDTH / HEADLINE_SIZE) * 10) / 10 - 0.3;

const TAGLINE_SIZE = 36;
const TAGLINE_LINES = 3;
const TOPIC_LIMIT = 3;
const TOPIC_MAX_WIDTH = 8;

export type CompatibilityPerson = {
  name: string;
  photoUrl: string | null;
};

export type CompatibilityStoryCardProps = {
  /** 공유하는 사람(나) — 왼쪽 */
  me: CompatibilityPerson;
  /** 상대 — 오른쪽 */
  target: CompatibilityPerson;
  /** 0-100 */
  score: number;
  /** 궁합 타입 이름 ("나란히 걷는 독서가") — 점수 구간으로 서버가 정한 이름 */
  typeName: string;
  /** 타입 한 줄 설명 */
  tagline: string;
  /** 공통 관심사 — 앞에서 몇 개만 */
  interests: string[];
};

/** 한 사람의 사진 — 사진이 없으면 이름 첫 글자 */
const PairAvatar = ({
  person,
  offset,
}: {
  person: CompatibilityPerson;
  offset: number;
}) => {
  const frame = {
    display: 'flex',
    width: AVATAR,
    height: AVATAR,
    marginLeft: offset,
    borderRadius: AVATAR / 2,
    border: '6px solid #ffffff',
  } as const;

  return person.photoUrl ? (
    // satori 는 next/image 를 렌더하지 못한다 — 이 파일은 브라우저로 나가지 않는다
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={person.photoUrl}
      alt=''
      width={AVATAR}
      height={AVATAR}
      style={{ ...frame, objectFit: 'cover' }}
    />
  ) : (
    <div
      style={{
        ...frame,
        alignItems: 'center',
        justifyContent: 'center',
        background: OG_COLORS.paper,
        color: OG_COLORS.brand,
        fontSize: 56,
        fontWeight: 800,
      }}
    >
      {/* 서로게이트 쌍(이모지)을 반으로 자르지 않게 코드 포인트 단위로 뗀다 */}
      {[...person.name][0] ?? ''}
    </div>
  );
};

/**
 * 독서 케미 스토리 이미지 (1080×1920) — 케미 결과 화면의 공유 버튼.
 *
 * 서재 스토리와 같은 틀: 위는 파란 무대(누구와 누구인지, 어떤 사이인지),
 * 아래 흰 면은 숫자 하나(케미 점수)와 한 줄 설명, 공통 관심사.
 * "우리 케미 몇 점"은 보는 사람이 "나도 해 볼까"로 이어지는 형식이라
 * 아래 한 줄(page0127.com에서 내 책장 만들기)과 링크 공유(상대 서재의 케미 화면)를 함께 쓴다.
 * 위아래 250px 은 인스타가 덮는 자리라 비워 둔다.
 */
export const CompatibilityStoryCard = ({
  me,
  target,
  score,
  typeName,
  tagline,
  interests,
}: CompatibilityStoryCardProps) => {
  const headline = balanceLines(typeName, HEADLINE_LINE_WIDTH);
  const taglineLines = balancedWrap(
    tagline,
    Math.floor((STORY_CONTENT_WIDTH / TAGLINE_SIZE) * 10) / 10 - 1,
    TAGLINE_LINES
  );
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundImage: STAGE_BACKGROUND,
      }}
    >
      {/* 위 — 파란 면. 높이가 고정이라 누구의 케미든 경계가 같은 자리에 선다 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: PANEL_TOP + PANEL_RADIUS,
          padding: `${STORY_HEADER_TOP}px ${STORY_GUTTER}px 0`,
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <PairAvatar person={me} offset={0} />
          <PairAvatar person={target} offset={-AVATAR_OVERLAP} />
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
                fontSize: 30,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              AI 독서 케미
            </div>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>
              {`${truncate(me.name, NAME_MAX_WIDTH)} & ${truncate(
                target.name,
                NAME_MAX_WIDTH
              )}`}
            </div>
          </div>
        </div>

        {/* 줄은 손으로 나눈다(balanceLines) — 한 단어만 다음 줄로 떨어지지 않게 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 72 + STORY_HEADER_DROP,
            fontSize: HEADLINE_SIZE,
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: -2,
          }}
        >
          {headline.map((line) => (
            <div key={line} style={{ display: 'flex' }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* 아래 — 흰 면. 숫자 하나를 크게(서재 스토리의 권수와 같은 문법), 그 아래 한 줄 설명 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          marginTop: -PANEL_RADIUS,
          padding: `64px ${STORY_GUTTER}px ${STORY_SAFE_Y}px`,
          borderTopLeftRadius: PANEL_RADIUS,
          borderTopRightRadius: PANEL_RADIUS,
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 34,
            fontWeight: 500,
            color: OG_COLORS.inkSoft,
          }}
        >
          두 사람의 케미
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 200,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -6,
              color: OG_COLORS.brand,
            }}
          >
            {String(clamped)}
          </div>
          <div
            style={{
              display: 'flex',
              marginLeft: 12,
              fontSize: 56,
              fontWeight: 700,
              color: OG_COLORS.inkSoft,
            }}
          >
            점
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 36,
            fontSize: TAGLINE_SIZE,
            fontWeight: 500,
            lineHeight: 1.45,
            color: OG_COLORS.inkSoft,
          }}
        >
          {taglineLines.map((line, i) => (
            <div key={i} style={{ display: 'flex' }}>
              {line}
            </div>
          ))}
        </div>

        {interests.length > 0 && (
          <div style={{ display: 'flex', marginTop: 40 }}>
            {interests.slice(0, TOPIC_LIMIT).map((topic, i) => (
              <div
                key={topic}
                style={{
                  display: 'flex',
                  marginLeft: i === 0 ? 0 : 12,
                  padding: '10px 26px',
                  borderRadius: 40,
                  // 옅은 브랜드 파랑 면 — 흰 면 위에서 칩으로 읽히는 가장 옅은 파랑(blue/50 근처)
                  background: '#eaf2fd',
                  color: OG_COLORS.accentDeep,
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                {`#${truncate(topic, TOPIC_MAX_WIDTH)}`}
              </div>
            ))}
          </div>
        )}
      </div>

      <StoryFooter />
    </div>
  );
};
