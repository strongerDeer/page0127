import { renderOg } from '@/shared/lib/og/render';
import {
  BrandStage,
  FeatureStage,
  STAGE_GUTTER,
  STAGE_HEIGHT,
  STAGE_TEXT_SOFT,
  StageBookTitle,
  StageCard,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE, truncate } from '@/shared/lib/og/theme';

import { formatChartValue } from '@/entities/story/model/chartBlock';
import { getPublishedStory } from '@/entities/story/server';

import { getStoryBook } from '@/widgets/story';

import type { StoryLeadStat } from '@/entities/story';

// 책 이야기 한 편의 공유 이미지 — 글을 저장하면 코드가 그린다(HJ 2026-11-24: 썸네일 직접 안 만들기).
//
// 다른 공유 카드와 같은 "파란 무대 + 흰 띠" 틀을 쓴다. 카톡은 이미지 아래에 글 제목을 또 보여 주므로
// 무대에는 제목 대신 그 아래에 없는 것을 세운다:
//   책 한 권 글  → 책 표지 + 책 제목·저자
//   독서 이야기  → 본문 첫 차트의 큰 숫자(38.5%)와 사람 그림
//   둘 다 없으면 → 브랜드 카드
//
// 관계도 그림(세로 2:3)을 og:image 로 넘기던 것은 그만둔다 — 가로 카드에서 위아래가 잘렸다
// (도서 상세 OG 와 같은 이유, 2026-10-07 점검).
//
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '책 이야기 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';
/** 글 페이지와 같은 하루 — 저장하면 revalidateStoryPages 가 페이지와 함께 다시 만든다 */
export const revalidate = 86400;

type Props = {
  params: Promise<{ slug: string }>;
};

const CTA_BOOK = '책 이야기 읽기';
const CTA_TALK = '독서 이야기 읽기';

/** 무대 위 사람 10명 — satori 는 SVG 부분 채우기가 불안해 칸마다 둥근 막대로 그린다 */
const PeopleRow = ({ filled }: { filled: number }) => (
  <div style={{ display: 'flex', marginTop: 36 }}>
    {Array.from({ length: 10 }, (_, index) => {
      const ratio = Math.max(0, Math.min(1, filled - index));
      return (
        <div
          key={index}
          style={{
            display: 'flex',
            width: 44,
            height: 74,
            marginRight: index === 9 ? 0 : 12,
            borderRadius: '22px 22px 8px 8px',
            background: 'rgba(255, 255, 255, 0.25)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 44 * ratio,
              height: '100%',
              background: OG_COLORS.paper,
            }}
          />
        </div>
      );
    })}
  </div>
);

const StatStage = ({ stat }: { stat: StoryLeadStat }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      position: 'absolute',
      left: STAGE_GUTTER,
      top: 0,
      height: STAGE_HEIGHT,
      color: OG_COLORS.paper,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
      <div
        style={{
          display: 'flex',
          fontSize: 150,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: -4,
        }}
      >
        {formatChartValue(stat.value)}
      </div>
      <div
        style={{
          display: 'flex',
          marginLeft: 8,
          marginBottom: 14,
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        {stat.unit}
      </div>
    </div>
    {stat.label ? (
      <div
        style={{
          display: 'flex',
          marginTop: 18,
          fontSize: 34,
          fontWeight: 500,
          color: STAGE_TEXT_SOFT,
        }}
      >
        {truncate(stat.label, 30)}
      </div>
    ) : null}
    {stat.people !== null ? <PeopleRow filled={stat.people} /> : null}
  </div>
);

const Image = async ({ params }: Props) => {
  const { slug } = await params;
  const story = await getPublishedStory(slug).catch((error: unknown) => {
    console.error('책 이야기 OG 조회 실패:', error);
    return null;
  });

  if (!story) return renderOg(<BrandStage cta={CTA_BOOK} />);

  if (story.bookId) {
    const book = await getStoryBook(story.bookId);
    return renderOg(
      <StageCard cta={CTA_BOOK}>
        <FeatureStage cover={book?.cover_image ?? null}>
          <StageBookTitle title={story.bookTitle} author={story.author} />
        </FeatureStage>
      </StageCard>
    );
  }

  if (story.leadStat)
    return renderOg(
      <StageCard cta={CTA_TALK}>
        <StatStage stat={story.leadStat} />
      </StageCard>
    );

  return renderOg(<BrandStage cta={CTA_TALK} />);
};

export default Image;
