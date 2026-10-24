import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

import { Cover, STAGE_BACKGROUND, STAGE_TEXT_SOFT } from './StageCard';
import { OG_COLORS, STORY_SIZE, truncate } from './theme';

/**
 * 인스타 스토리가 위·아래를 덮는 높이 — 위는 프로필 줄, 아래는 답장 입력창.
 * 중요한 것은 이 둘 사이에만 둔다(인스타 권장 안전 영역 ≈ 위아래 250px).
 */
const STORY_SAFE_Y = 250;
const STORY_GUTTER = 88;
const CONTENT_WIDTH = STORY_SIZE.width - STORY_GUTTER * 2;

const HEADLINE_MAX_WIDTH = 18;
const NAME_MAX_WIDTH = 12;
const ADDRESS_MAX_WIDTH = 24;
const TOPIC_MAX_WIDTH = 8;

/**
 * 책장이 쓸 수 있는 세로 — 성향·숫자와 함께 안전 영역에 들어가는 높이.
 * 이 안에서 한 단으로 크게 세우거나, 넘치면 두 단으로 나눈다(toShelfLayout).
 */
const SHELF_SPACE = 480;
/** 선반 널 두께와 다음 단까지의 틈 */
const SHELF_BOARD = 12;
const SHELF_ROW_GAP = 36;
/** 책 사이 틈 */
const SHELF_BOOK_GAP = 3;
/** 한 단일 때 이보다 낮아지면 두 단으로 나눈다 — 이보다 작으면 책등이 실처럼 보인다 */
const SHELF_MIN_ONE_ROW = 260;
/** 한 단일 때 이보다 높이지 않는다 — 책이 적으면 표지 한 장이 화면을 덮는다 */
const SHELF_MAX_ONE_ROW = 380;
/** 서재 책장은 240px 높이 기준으로 책등 폭을 만든다(spineWidth.ts) */
const SHELF_BASE_HEIGHT = 240;
/**
 * 책등 이미지의 폭 ÷ 높이 추정값. 실측(spineWidth.ts)은 240px 높이에서 12~27px(≈0.05~0.11).
 * 실제 폭은 satori 가 이미지에서 읽으므로 이 값은 "몇 권이 한 단에 들어갈지" 가늠에만 쓴다.
 * 넉넉하게 잡는다 — 작게 잡으면 책이 넘쳐 잘리고, 크게 잡으면 오른쪽이 조금 빌 뿐이다.
 */
const SPINE_RATIO_ESTIMATE = 0.085;

/** 표지 일렬 (책이 적을 때) — 5장이면 본문 폭을 꽉 채운다 */
const ROW_COVER = { width: 168, height: 252 } as const;
const ROW_COVER_GAP = (CONTENT_WIDTH - ROW_COVER.width * 5) / 4;

/**
 * 책등 이미지가 없는 책의 색 — 무대 파랑과 겹치지 않는 남색·흰색·옅은 파랑을 번갈아 세운다
 * (공유 카드의 StageBooks 와 같은 팔레트)
 */
const PLAIN_SPINES = [
  { bg: '#14294e', fg: '#ffffff' },
  { bg: '#ffffff', fg: OG_COLORS.ink },
  { bg: '#93c0fb', fg: OG_COLORS.ink },
  { bg: '#0f1f3d', fg: '#ffffff' },
  { bg: '#d6e6fd', fg: OG_COLORS.ink },
] as const;

/** 스토리 책장에 세울 한 권 (어떤 책을 어떤 모양으로 세울지는 widgets/public-library/model/storyShelf) */
export type StoryShelfItem =
  /** 인생책·5점 — 표지를 앞으로. 표지가 없으면 제목 판 */
  | { kind: 'cover'; key: string; title: string; src: string | null }
  /** 책등 이미지 — 높이만 정하고 폭은 원본 비율에 맡긴다(satori 가 이미지에서 읽는다) */
  | { kind: 'spine'; key: string; title: string; src: string }
  /** 책등 이미지가 없는 책 — width 는 서재 책장 기준(240px 높이)의 폭 */
  | { kind: 'plain'; key: string; title: string; width: number };

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
  /** 2단 책장 — null 이면 covers 를 일렬로 */
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

/** 책 한 권이 높이 1 일 때 차지하는 폭 */
const unitWidth = (item: StoryShelfItem): number =>
  item.kind === 'cover'
    ? 2 / 3
    : item.kind === 'spine'
      ? SPINE_RATIO_ESTIMATE
      : item.width / SHELF_BASE_HEIGHT;

/**
 * 책장 모양 — 권수에 맞춰 책 높이를 정해 선반 폭을 채운다.
 *
 * 책등은 얇아서(높이의 5~11%) 높이를 고정하면 15권이 반 단도 못 채운다.
 * 그래서 한 단에 다 들어가는 가장 큰 높이를 먼저 보고, 그게 너무 낮으면(실처럼 보이면)
 * 두 단으로 나눠 다시 잰다. 높이는 어느 쪽이든 SHELF_SPACE 안에 든다.
 */
export const toShelfLayout = (
  items: StoryShelfItem[],
  width: number
): { rows: 1 | 2; bookHeight: number } => {
  const units = items.reduce((sum, item) => sum + unitWidth(item), 0);
  const gaps = SHELF_BOOK_GAP * Math.max(items.length - 1, 0);
  const fit = (rows: number) =>
    units > 0 ? (width * rows - gaps) / units : Infinity;

  const oneRow = Math.min(SHELF_MAX_ONE_ROW, fit(1));
  if (oneRow >= SHELF_MIN_ONE_ROW) {
    return { rows: 1, bookHeight: Math.floor(oneRow) };
  }

  const twoRowMax = (SHELF_SPACE - SHELF_ROW_GAP) / 2 - SHELF_BOARD;
  return { rows: 2, bookHeight: Math.floor(Math.min(twoRowMax, fit(2))) };
};

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
  if (item.kind === 'spine') {
    return (
      // satori 는 next/image 를 렌더하지 못한다 — 높이만 주면 폭은 이미지 비율대로 정해진다
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.src} alt='' height={height} style={{ height }} />
    );
  }

  const coverWidth = Math.round((height * 2) / 3);
  if (item.kind === 'cover' && item.src) {
    return <Cover src={item.src} width={coverWidth} height={height} />;
  }

  const palette = PLAIN_SPINES[index % PLAIN_SPINES.length];
  const width =
    item.kind === 'cover'
      ? coverWidth
      : Math.round((item.width * height) / SHELF_BASE_HEIGHT);

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

/**
 * 책장 — 줄바꿈(flex-wrap)으로 채우고, 정한 단 수를 넘는 책은 잘라 낸다.
 * 실제 책등 폭은 추정과 조금 다를 수 있어 넘친 책은 보이지 않게 한다(오른쪽 끝에서 잘리지 않는다).
 */
const Shelf = ({ items }: { items: StoryShelfItem[] }) => {
  const { rows, bookHeight } = toShelfLayout(items, CONTENT_WIDTH);
  const rowHeight = bookHeight + SHELF_BOARD + SHELF_ROW_GAP;
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: CONTENT_WIDTH,
        height: rowHeight * rows - SHELF_ROW_GAP,
        overflow: 'hidden',
      }}
    >
      {/* 선반 널 — 각 단의 책 바로 아래 */}
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          style={{
            display: 'flex',
            position: 'absolute',
            left: 0,
            top: row * rowHeight + bookHeight,
            width: CONTENT_WIDTH,
            height: SHELF_BOARD,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.85)',
          }}
        />
      ))}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          width: CONTENT_WIDTH,
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              height: bookHeight,
              marginRight: SHELF_BOOK_GAP,
              marginBottom: SHELF_BOARD + SHELF_ROW_GAP,
            }}
          >
            <ShelfBook item={item} index={i} height={bookHeight} />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 서재 스토리 이미지 (1080×1920) — 공유 카드(StageCard)와 같은 파란 무대·같은 명함 규칙.
 *
 * 위에서부터: 사진·이름·주소 → 성향(주인공)·주제 태그 → 2단 책장 → 권수(크게).
 * 안전 영역 안에서 세로 가운데 정렬 — 책이 적거나 숫자가 없어도 빈 자리가 한쪽에 몰리지 않는다.
 * 폰트를 못 받으면 글자가 사라질 수 있어(theme.ts), 뼈대는 책장 같은 면이 진다.
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
    {/* 누구의 서재인지 — 사진·이름·주소. 오른쪽 끝은 브랜드 심볼 */}
    <div style={{ display: 'flex', alignItems: 'center' }}>
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
    <div
      style={{
        display: 'flex',
        marginTop: label ? 24 : 64,
        width: CONTENT_WIDTH,
        fontSize: label ? 92 : 76,
        fontWeight: 800,
        lineHeight: 1.18,
        letterSpacing: -2,
        wordBreak: 'keep-all',
      }}
    >
      {truncate(headline, HEADLINE_MAX_WIDTH)}
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

    <div style={{ display: 'flex', marginTop: 64 }}>
      {shelf ? (
        <Shelf items={shelf} />
      ) : (
        covers.map((src, i) => (
          <div
            key={src}
            style={{ display: 'flex', marginLeft: i === 0 ? 0 : ROW_COVER_GAP }}
          >
            <Cover src={src} {...ROW_COVER} />
          </div>
        ))
      )}
    </div>

    {/* 숫자는 권수 하나만 크게 — 서재 통계 카드와 같은 문법(큰 숫자 + 작은 단위) */}
    {count && (
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 34,
            fontWeight: 500,
            color: STAGE_TEXT_SOFT,
          }}
        >
          {count.label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 168,
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
              marginLeft: 12,
              fontSize: 56,
              fontWeight: 700,
            }}
          >
            권
          </div>
        </div>
      </div>
    )}
  </div>
);
