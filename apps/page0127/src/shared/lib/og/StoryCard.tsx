import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

import { balanceLines } from './balanceLines';
import { Cover, STAGE_BACKGROUND, STAGE_TEXT_SOFT } from './StageCard';
import {
  bookWidth,
  SHELF_BOOK_GAP,
  type StoryShelfItem,
  toShelfLayout,
} from './storyShelfLayout';
import { OG_COLORS, STORY_SIZE, truncate } from './theme';

export type { StoryShelfItem } from './storyShelfLayout';

/**
 * 인스타 스토리가 위·아래를 덮는 높이 — 위는 프로필 줄, 아래는 답장 입력창.
 * 중요한 것은 이 둘 사이에만 둔다(인스타 권장 안전 영역 ≈ 위아래 250px).
 */
export const STORY_SAFE_Y = 250;
export const STORY_GUTTER = 88;
export const STORY_CONTENT_WIDTH = STORY_SIZE.width - STORY_GUTTER * 2;
const CONTENT_WIDTH = STORY_CONTENT_WIDTH;

const HEADLINE_SIZE = 92;
const HEADLINE_MAX_WIDTH = 18;
/** 한 줄에 들어가는 성향 이름 폭(한글 글자 수) — 본문 폭 ÷ 글자 크기, 여유를 조금 둔다 */
const HEADLINE_LINE_WIDTH =
  Math.floor((CONTENT_WIDTH / HEADLINE_SIZE) * 10) / 10 - 0.3;
const NAME_MAX_WIDTH = 12;
const ADDRESS_MAX_WIDTH = 24;
const TOPIC_MAX_WIDTH = 8;

/** 선반 널 두께와 다음 단까지의 틈 */
const SHELF_BOARD = 12;
const SHELF_ROW_GAP = 36;

/** 표지 일렬 (책이 적을 때) */
const ROW_COVER = { width: 168, height: 252 } as const;
const ROW_COVER_GAP = 16;

/** 흰 면 위로 올라온 카드의 둥근 위 모서리 */
export const PANEL_RADIUS = 56;
/**
 * 파랑·흰 면의 경계 — 고정이다. 성향 이름이 한 줄이든 두 줄이든 경계가 같은 자리에 서야
 * 누구의 서재든 같은 틀로 읽힌다. 위 면에서 가장 긴 경우(이름 두 줄 + 태그)가 ≈800px 에서 끝난다.
 */
const PANEL_TOP = 900;

/**
 * 책등 이미지가 없는 책의 색 — 흰 면 위라 흰색은 쓰지 않는다. 남색·브랜드 파랑·옅은 파랑을 번갈아 세운다
 */
const PLAIN_SPINES = [
  { bg: '#14294e', fg: '#ffffff' },
  { bg: OG_COLORS.brand, fg: '#ffffff' },
  { bg: '#93c0fb', fg: OG_COLORS.ink },
  { bg: '#0f1f3d', fg: '#ffffff' },
  { bg: '#d6e6fd', fg: OG_COLORS.ink },
] as const;

export type StoryCardProps = {
  photoUrl: string | null;
  name: string;
  /** 이미지 안에 적는 주소 — 인스타 게시물엔 링크를 걸 수 없다 */
  address: string;
  /** 성향 라벨 칩 ("AI 독서 성향") — 성향이 없으면 null */
  label: string | null;
  /** 가장 큰 줄 — 성향 이름, 없으면 슬로건 */
  headline: string;
  /** 성향 색 — 라벨 칩 안의 점 */
  accent: string | null;
  topics: string[];
  /** 책장 (최대 2단) — null 이면 covers 를 일렬로 */
  shelf: StoryShelfItem[] | null;
  covers: string[];
  /** 크게 보일 권수 하나 */
  count: { label: string; value: number } | null;
};

const Avatar = ({ src, name }: { src: string | null; name: string }) =>
  src ? (
    // satori 는 next/image 를 렌더하지 못한다 — 이 파일은 브라우저로 나가지 않는다
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=''
      width={112}
      height={112}
      style={{
        borderRadius: 56,
        objectFit: 'cover',
        border: '4px solid #ffffff',
      }}
    />
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 112,
        height: 112,
        borderRadius: 56,
        background: OG_COLORS.paper,
        color: OG_COLORS.brand,
        fontSize: 48,
        fontWeight: 800,
      }}
    >
      {/* 서로게이트 쌍(이모지)을 반으로 자르지 않게 코드 포인트 단위로 뗀다 */}
      {[...name][0] ?? ''}
    </div>
  );

/**
 * 맨 위 프로필 줄 — 사진·이름·주소, 오른쪽 끝은 브랜드 심볼. 파란 면 위에 흰 글자.
 * 서재·책 스토리 이미지가 같은 줄로 시작해야 같은 서비스의 이미지로 읽힌다.
 */
export const StoryProfile = ({
  photoUrl,
  name,
  address,
}: {
  photoUrl: string | null;
  name: string;
  address: string;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', color: '#ffffff' }}>
    <Avatar src={photoUrl} name={name} />
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        marginLeft: 28,
      }}
    >
      <div style={{ display: 'flex', fontSize: 46, fontWeight: 800 }}>
        {truncate(name, NAME_MAX_WIDTH)}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 4,
          fontSize: 30,
          fontWeight: 500,
          color: STAGE_TEXT_SOFT,
        }}
      >
        {truncate(address, ADDRESS_MAX_WIDTH)}
      </div>
    </div>
    <BrandSymbol size={64} />
  </div>
);

/** 제목을 세로로 쌓는다 — satori 는 writing-mode 를 모른다. 한글은 원래 글자를 쌓는 세로쓰기다 */
const StackedTitle = ({
  title,
  color,
  height,
}: {
  title: string;
  color: string;
  height: number;
}) => {
  const font = Math.min(30, Math.max(16, Math.round(height * 0.09)));
  const fit = Math.floor((height - 24) / (font + 2));
  const chars = [...title.replace(/\s+/g, '')].slice(0, fit);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        color,
        fontSize: font,
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      {chars.map((ch, i) => (
        <div key={i} style={{ display: 'flex' }}>
          {ch}
        </div>
      ))}
    </div>
  );
};

const ShelfBook = ({
  item,
  index,
  height,
}: {
  item: StoryShelfItem;
  index: number;
  height: number;
}) => {
  const width = bookWidth(item, height);

  if (item.kind === 'spine') {
    // 폭까지 정해 준다 — 단 나누기를 이 폭으로 계산했다(ratio 는 이미지 헤더에서 읽은 값)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.src} alt='' width={width} height={height} />;
  }

  if (item.kind === 'cover' && item.src) {
    return <Cover src={item.src} width={width} height={height} />;
  }

  const palette = PLAIN_SPINES[index % PLAIN_SPINES.length];
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        width,
        height,
        borderRadius: 3,
        background: palette.bg,
      }}
    >
      <StackedTitle title={item.title} color={palette.fg} height={height} />
    </div>
  );
};

/** 책장 — 최대 2단, 각 단은 가운데. 몇 단으로 나눌지는 toShelfLayout 이 정한다 */
const Shelf = ({ items }: { items: StoryShelfItem[] }) => {
  const { rows, bookHeight } = toShelfLayout(items, CONTENT_WIDTH);
  let index = 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map((row, r) => (
        <div
          key={r}
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: r === 0 ? 0 : SHELF_ROW_GAP,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              width: CONTENT_WIDTH,
              height: bookHeight,
              overflow: 'hidden',
            }}
          >
            {row.map((item, i) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  marginLeft: i === 0 ? 0 : SHELF_BOOK_GAP,
                }}
              >
                <ShelfBook item={item} index={index++} height={bookHeight} />
              </div>
            ))}
          </div>
          {/* 선반 널 */}
          <div
            style={{
              display: 'flex',
              width: CONTENT_WIDTH,
              height: SHELF_BOARD,
              borderRadius: 3,
              background: OG_COLORS.line,
              boxShadow: '0 8px 16px rgba(20, 41, 78, 0.12)',
            }}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * 서재 스토리 이미지 (1080×1920).
 *
 * 위는 파란 무대(공유 카드와 같은 바탕) — 누구인지·어떤 독자인지.
 * 아래는 흰 면 — 책장과 권수. 책은 흰 바탕에서 표지·책등 색이 제대로 산다(서재 화면과 같은 바탕).
 * 위아래 250px 은 인스타가 덮는 자리라 비워 둔다. 폰트를 못 받으면 글자가 사라질 수 있어(theme.ts)
 * 뼈대는 파란 면·흰 면·책장 같은 면이 진다.
 */
export const StoryCard = ({
  photoUrl,
  name,
  address,
  label,
  headline,
  accent,
  topics,
  shelf,
  covers,
  count,
}: StoryCardProps) => {
  const headlineSize = label ? HEADLINE_SIZE : 76;
  const headlineLines = balanceLines(
    truncate(headline, HEADLINE_MAX_WIDTH),
    label ? HEADLINE_LINE_WIDTH : (CONTENT_WIDTH / headlineSize) * 0.95
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: STAGE_BACKGROUND,
      }}
    >
      {/* 위 — 파란 면. 높이가 고정이라 내용이 짧으면 아래가 숨을 쉰다 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: PANEL_TOP + PANEL_RADIUS,
          padding: `${STORY_SAFE_Y}px ${STORY_GUTTER}px 0`,
          color: '#ffffff',
        }}
      >
        {/* 누구의 서재인지 — 사진·이름·주소. 오른쪽 끝은 브랜드 심볼 */}
        <StoryProfile photoUrl={photoUrl} name={name} address={address} />

        {/* 라벨은 흰 칩 — 성향 색은 대부분 파란 계열이라 파란 바탕에 점만 두면 속 빈 테두리로 보인다 */}
        {label && (
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
              {label}
            </div>
          </div>
        )}
        {/* 줄은 손으로 나눈다(balanceLines) — 한 단어만 다음 줄로 떨어지지 않게 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: label ? 24 : 64,
            fontSize: headlineSize,
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

        {topics.length > 0 && (
          <div style={{ display: 'flex', marginTop: 24 }}>
            {topics.map((topic, i) => (
              <div
                key={topic}
                style={{
                  display: 'flex',
                  marginLeft: i === 0 ? 0 : 12,
                  padding: '8px 22px',
                  borderRadius: 30,
                  background: 'rgba(255, 255, 255, 0.18)',
                  fontSize: 30,
                  fontWeight: 500,
                }}
              >
                {`#${truncate(topic, TOPIC_MAX_WIDTH)}`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/*
        아래 — 흰 면. 위 모서리를 둥글게 해 파란 무대 위로 올라온 카드처럼.
        책장과 권수는 한 덩어리(책장 + 캡션)라 둘 다 가운데 — 책만 가운데고 숫자가 왼쪽이면 어긋나 보인다.
        세로도 가운데: 아래 250px(인스타 답장창 자리)을 뺀 남은 칸의 한가운데
      */}
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
        {shelf ? (
          <Shelf items={shelf} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {covers.map((src, i) => (
              <div
                key={src}
                style={{
                  display: 'flex',
                  marginLeft: i === 0 ? 0 : ROW_COVER_GAP,
                }}
              >
                <Cover src={src} {...ROW_COVER} />
              </div>
            ))}
          </div>
        )}

        {/* 숫자는 권수 하나만 크게 — 서재 통계 카드와 같은 문법(큰 숫자 + 작은 단위) */}
        {count && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 56,
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
              {count.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 140,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: -4,
                }}
              >
                {count.value.toLocaleString('ko-KR')}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginLeft: 10,
                  fontSize: 48,
                  fontWeight: 700,
                  color: OG_COLORS.inkSoft,
                }}
              >
                권
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
