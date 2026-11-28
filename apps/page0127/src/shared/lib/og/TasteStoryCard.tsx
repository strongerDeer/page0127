import { balanceLines } from './balanceLines';
import { balancedWrap } from './balanceLines';
import { STAGE_BACKGROUND } from './StageCard';
import {
  PANEL_RADIUS,
  STORY_CONTENT_BOTTOM,
  STORY_CONTENT_WIDTH,
  STORY_GUTTER,
  STORY_SAFE_Y,
  StoryFooter,
  StoryProfile,
} from './StoryCard';
import { OG_COLORS, truncate } from './theme';

/** 성향 이름 — 서재 스토리(StoryCard)와 같은 크기·같은 줄 나누기라 두 이미지가 한 틀로 읽힌다 */
const HEADLINE_SIZE = 92;
const HEADLINE_MAX_WIDTH = 18;
const HEADLINE_LINE_WIDTH =
  Math.floor((STORY_CONTENT_WIDTH / HEADLINE_SIZE) * 10) / 10 - 0.3;

/**
 * 파랑·흰 면 경계 — 고정. 성향 이름이 한 줄이든 두 줄이든 같은 자리여야 같은 틀로 읽힌다.
 * 위 면에서 가장 긴 경우(이름 두 줄)가 ≈730px 에서 끝난다. 서재 스토리(900)보다 높은 건
 * 아래 흰 면에 설명 + 근거 책 세 권이 들어가야 해서다.
 */
const PANEL_TOP = 800;

/** 설명 한 문장 — 근거 책이 있으면 세 줄, 없으면(옛 분석) 흰 면을 혼자 채우니 크게 여섯 줄 */
const DESCRIPTION = {
  withEvidence: { size: 40, lines: 3 },
  alone: { size: 48, lines: 6 },
} as const;
/** 한 줄 폭(한글 글자 수) — QuoteStoryCard 와 같은 보정(무게 500 한글은 글자 크기보다 조금 좁다) */
const lineWidth = (fontSize: number) =>
  Math.floor((STORY_CONTENT_WIDTH / fontSize) * 1.04 * 10) / 10;

/** 근거 책 한 줄 — 표지(2:3) 옆에 제목·태그 */
const EVIDENCE_COVER = { width: 92, height: 138 } as const;
const EVIDENCE_GAP = 16;
/** 근거 책 한 줄의 폭 — 표지 + 가장 긴 제목(15자) 정도. 본문 폭(904)보다 좁혀 가운데에 둔다 */
const EVIDENCE_ROW_WIDTH = 720;
const TITLE_MAX_WIDTH = 15;
const TOPIC_MAX_WIDTH = 8;

export type TasteStoryEvidence = {
  title: string;
  cover: string | null;
  topics: string[];
};

export type TasteStoryCardProps = {
  photoUrl: string | null;
  name: string;
  /** 이미지 안에 적는 서재 주소 — 인스타 스토리엔 링크를 바로 걸 수 없다 */
  address: string;
  personalityType: string;
  /** 성향 색 — 라벨 칩 안의 점 */
  accent: string | null;
  /** 설명 첫 문장 */
  description: string;
  /** 공개 책만, 최대 세 권 — 비면 설명만 그린다 */
  evidence: TasteStoryEvidence[];
};

/**
 * AI 취향 분석 스토리 이미지 (1080×1920) — 분석 결과 화면 "독서 성향" 카드의 공유 버튼(HJ B안, 2026-11-27).
 *
 * 서재 스토리와 같은 문법: 위는 파란 무대 + 프로필 줄 + "AI 독서 성향" 칩 + 성향 이름,
 * 아래 흰 면에 **왜 이런 사람인지** — 설명 한 문장과 "이렇게 본 이유" 근거 책 세 권.
 * 서재 스토리는 책장이 주인공이라, 이 이미지는 같은 성향 이름이라도 근거로 다르게 읽힌다.
 * 위아래 250px 은 인스타가 덮는 자리라 비워 둔다.
 */
export const TasteStoryCard = ({
  photoUrl,
  name,
  address,
  personalityType,
  accent,
  description,
  evidence,
}: TasteStoryCardProps) => {
  const headlineLines = balanceLines(
    truncate(personalityType, HEADLINE_MAX_WIDTH),
    HEADLINE_LINE_WIDTH
  );
  const desc =
    evidence.length > 0 ? DESCRIPTION.withEvidence : DESCRIPTION.alone;
  const descLines = balancedWrap(description, lineWidth(desc.size), desc.lines);

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

      {/* 위 — 파란 면의 내용 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: `${STORY_SAFE_Y}px ${STORY_GUTTER}px 0`,
          color: '#ffffff',
        }}
      >
        <StoryProfile photoUrl={photoUrl} name={name} address={address} />

        {/* 라벨은 흰 칩 — 서재 스토리와 같다(성향 색은 파란 계열이라 칩 안의 점으로) */}
        <div style={{ display: 'flex', marginTop: 64 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 28px',
              borderRadius: 40,
              background: OG_COLORS.paper,
              color: OG_COLORS.ink,
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {accent && (
              <div
                style={{
                  display: 'flex',
                  width: 22,
                  height: 22,
                  marginRight: 14,
                  borderRadius: 11,
                  background: accent,
                }}
              />
            )}
            AI 독서 성향
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 24,
            fontSize: HEADLINE_SIZE,
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: -2,
          }}
        >
          {headlineLines.map((line) => (
            <div key={line} style={{ display: 'flex' }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* 아래 — 흰 면의 내용. 아래 250px(인스타 답장창 자리)을 뺀 칸의 가운데 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          // 가운데 정렬(HJ 11/27) — 설명·"이렇게 본 이유"·근거 책 묶음 모두 가운데 축에
          alignItems: 'center',
          position: 'absolute',
          top: PANEL_TOP,
          left: 0,
          right: 0,
          bottom: STORY_CONTENT_BOTTOM,
          padding: `56px ${STORY_GUTTER}px 0`,
          color: OG_COLORS.ink,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: desc.size,
            fontWeight: 500,
            lineHeight: 1.5,
            letterSpacing: -0.5,
          }}
        >
          {descLines.map((line, i) => (
            <div key={i} style={{ display: 'flex' }}>
              {line}
            </div>
          ))}
        </div>

        {evidence.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 44,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                fontWeight: 700,
                color: OG_COLORS.brand,
              }}
            >
              이렇게 본 이유
            </div>
            {evidence.map((item, i) => (
              <div
                key={`${item.title}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  // 줄마다 제목 길이가 달라도 표지가 한 세로줄에 서도록 묶음 폭을 고정하고 그 묶음을 가운데에
                  width: EVIDENCE_ROW_WIDTH,
                  marginTop: i === 0 ? 24 : EVIDENCE_GAP,
                }}
              >
                {item.cover ? (
                  // 흰 면 위라 Cover(파란 무대용 반투명 판형) 대신 옅은 파랑 판형 — 표지를 못 받아도 자리가 보인다
                  <div
                    style={{
                      display: 'flex',
                      position: 'relative',
                      flexShrink: 0,
                      ...EVIDENCE_COVER,
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#e3ecfa',
                      boxShadow: '0 8px 20px rgba(4, 30, 80, 0.18)',
                    }}
                  >
                    {/* satori 는 next/image 를 렌더하지 못한다 — 이 파일은 브라우저로 나가지 않는다 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.cover}
                      alt=''
                      {...EVIDENCE_COVER}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                ) : (
                  // 표지 없는 책 — 작은 남색 판형만. 제목은 바로 옆에 크게 있다
                  <div
                    style={{
                      display: 'flex',
                      flexShrink: 0,
                      ...EVIDENCE_COVER,
                      borderRadius: 8,
                      background: OG_COLORS.ink,
                    }}
                  />
                )}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: 32,
                    flex: 1,
                  }}
                >
                  <div
                    style={{ display: 'flex', fontSize: 36, fontWeight: 800 }}
                  >
                    {truncate(item.title, TITLE_MAX_WIDTH)}
                  </div>
                  {item.topics.length > 0 && (
                    <div style={{ display: 'flex', marginTop: 12 }}>
                      {item.topics.slice(0, 2).map((topic, t) => (
                        <div
                          key={topic}
                          style={{
                            display: 'flex',
                            marginLeft: t === 0 ? 0 : 10,
                            padding: '6px 18px',
                            borderRadius: 24,
                            background: '#eaf2fe',
                            color: OG_COLORS.ink,
                            fontSize: 26,
                            fontWeight: 500,
                          }}
                        >
                          {`#${truncate(topic, TOPIC_MAX_WIDTH)}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StoryFooter cta='에서 내 취향 분석받기' />
    </div>
  );
};
