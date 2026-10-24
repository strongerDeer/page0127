import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

import { Cover, STAGE_BACKGROUND } from './StageCard';
import { OG_COLORS, STORY_SIZE, truncate } from './theme';

/**
 * 인스타 스토리가 위·아래를 덮는 높이 — 위는 프로필 줄, 아래는 답장 입력창.
 * 중요한 것은 이 둘 사이에만 둔다(인스타 권장 안전 영역 ≈ 위아래 250px).
 */
const STORY_SAFE_Y = 250;
const STORY_GUTTER = 96;
const CONTENT_WIDTH = STORY_SIZE.width - STORY_GUTTER * 2;

/** 성향 이름 최대 폭 — 96px 두 줄(한 줄 ≈ 한글 9자)에 들어가는 한계 */
const HEADLINE_MAX_WIDTH = 18;
const NAME_MAX_WIDTH = 12;
const ADDRESS_MAX_WIDTH = 22;

/** 표지 줄 — 5장이면 본문 폭을 꽉 채운다 (2:3 판형) */
const STORY_COVER = { width: 160, height: 240 } as const;
const STORY_COVER_GAP = (CONTENT_WIDTH - STORY_COVER.width * 5) / 4;

type StoryCardProps = {
  /** 성향 이름 위 작은 라벨 ("AI 독서 성향" · "책장의 첫인상") — 성향이 없으면 "공개 서재" */
  label: string;
  /** 가장 큰 줄 — 성향 이름, 없으면 "OO님의 서재" */
  headline: string;
  /** 성향 색 점 — 성향이 없으면 null */
  accent: string | null;
  /** 흰 카드 첫 줄 — headline 이 이름이면 겹치므로 null */
  owner: string | null;
  /** 숫자 한 줄 ("올해 12권 완독") — 내세울 만하지 않으면 null */
  stat: string | null;
  /** 이미지 안에 적는 주소 ("page0127.com/stronger_khj") — 인스타 게시물엔 링크를 걸 수 없다 */
  address: string;
  covers: readonly string[];
};

/**
 * 서재 스토리 이미지 (1080×1920) — 공유 카드(StageCard)와 같은 파란 무대·같은 명함 규칙.
 *
 * 위에서부터: 워드마크 → 성향(주인공) → 최근 표지 → 흰 카드(이름·숫자·주소).
 * 안전 영역 안에서 세로 가운데 정렬 — 표지가 없거나 숫자가 없어도 빈 자리가 한쪽에 몰리지 않는다.
 * 폰트를 못 받으면 글자가 사라질 수 있어(theme.ts), 뼈대는 표지·흰 카드 같은 면이 진다.
 */
export const StoryCard = ({
  label,
  headline,
  accent,
  owner,
  stat,
  address,
  covers,
}: StoryCardProps) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: `${STORY_SAFE_Y}px ${STORY_GUTTER}px`,
      backgroundImage: STAGE_BACKGROUND,
      color: '#ffffff',
    }}
  >
    {/* 파란 바탕 위 워드마크는 흰 글자 — 흰 띠용 BrandMark(남색 글자)를 쓰면 묻힌다 */}
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <BrandSymbol size={56} />
      <div
        style={{
          display: 'flex',
          marginLeft: 16,
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: -0.5,
        }}
      >
        page0127.
      </div>
    </div>

    {/*
      라벨은 흰 칩 — 성향 색은 대부분 파란 계열이라 파란 바탕에 점만 두면 속 빈 테두리로 보인다.
      흰 칩 안에서는 연한 색도 점으로 읽힌다.
    */}
    <div style={{ display: 'flex', marginTop: 96 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 28px',
          borderRadius: 40,
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
          fontSize: 34,
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
        {label}
      </div>
    </div>
    <div
      style={{
        display: 'flex',
        marginTop: 28,
        width: CONTENT_WIDTH,
        fontSize: 96,
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: -2,
        wordBreak: 'keep-all',
      }}
    >
      {truncate(headline, HEADLINE_MAX_WIDTH)}
    </div>

    {covers.length > 0 && (
      <div style={{ display: 'flex', marginTop: 88 }}>
        {covers.map((src, i) => (
          <div
            key={src}
            style={{
              display: 'flex',
              marginLeft: i === 0 ? 0 : STORY_COVER_GAP,
            }}
          >
            <Cover src={src} {...STORY_COVER} />
          </div>
        ))}
      </div>
    )}

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginTop: 88,
        padding: '52px 56px',
        borderRadius: 40,
        background: OG_COLORS.paper,
        color: OG_COLORS.ink,
      }}
    >
      {owner && (
        <div style={{ display: 'flex', fontSize: 52, fontWeight: 700 }}>
          {`${truncate(owner, NAME_MAX_WIDTH)}님의 서재`}
        </div>
      )}
      {stat && (
        <div
          style={{
            display: 'flex',
            marginTop: owner ? 12 : 0,
            fontSize: 40,
            fontWeight: 500,
            color: OG_COLORS.inkSoft,
          }}
        >
          {stat}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          marginTop: owner || stat ? 36 : 0,
          paddingTop: owner || stat ? 32 : 0,
          borderTop: owner || stat ? `2px solid ${OG_COLORS.line}` : 'none',
          fontSize: 40,
          fontWeight: 700,
          color: OG_COLORS.accentDeep,
        }}
      >
        {truncate(address, ADDRESS_MAX_WIDTH)}
      </div>
    </div>
  </div>
);
