import { RatingStars } from '@/shared/lib/og/RatingStars';
import { renderOg } from '@/shared/lib/og/render';
import {
  BrandStage,
  FeatureStage,
  STAGE_TEXT_SOFT,
  StageBookTitle,
  StageCard,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE } from '@/shared/lib/og/theme';

import { getGlobalBookCard } from '@/entities/book/api/getGlobalBookCard';

// 도서 상세(/books/info/[id])의 OG — 표지 한 장과 "몇 명이 읽었나"를 무대에 세운다.
//
// 전에는 og:image 로 YES24 표지 원본(세로 2:3)을 그대로 넘겼다. 가로 1.91:1 카드에서
// 위아래가 잘려 제목도 안 보이고, 다른 page0127. 카드와 생김새도 달랐다(2026-10-07 점검).
//
// 책 제목은 카톡이 아래에 보여 주므로, 무대에는 그 아래에 없는 숫자(완독 수·평점)를 싣는다.
// 아직 아무도 완독하지 않은 책만 제목을 쓴다.
//
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '도서 정보 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ id: string }>;
};

const Image = async ({ params }: Props) => {
  const { id } = await params;
  const book = await getGlobalBookCard(id).catch((error: unknown) => {
    console.error('도서 OG 조회 실패:', error);
    return null;
  });

  if (!book) {
    return renderOg(<BrandStage cta='책 둘러보기' />);
  }

  const read = book.completedCount > 0;

  return renderOg(
    <StageCard cta={read ? '읽은 사람들의 기록 보기' : '이 책 첫 기록 남기기'}>
      <FeatureStage cover={book.cover_image}>
        {read ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 96,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {book.completedCount}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginLeft: 12,
                  marginBottom: 8,
                  fontSize: 36,
                  color: STAGE_TEXT_SOFT,
                }}
              >
                명이 완독했어요
              </div>
            </div>

            {/* 평균 평점 — 매긴 사람이 없으면 줄을 그리지 않는다(빈 별은 0점으로 읽힌다) */}
            {book.avgRating > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: 28,
                }}
              >
                <RatingStars
                  score={Math.round(book.avgRating)}
                  size={36}
                  onColor={OG_COLORS.paper}
                  offColor='rgba(255, 255, 255, 0.3)'
                />
                <div
                  style={{
                    display: 'flex',
                    marginLeft: 16,
                    fontSize: 32,
                    fontWeight: 700,
                  }}
                >
                  {book.avgRating.toFixed(1)}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <StageBookTitle title={book.title} author={book.author} />
        )}
      </FeatureStage>
    </StageCard>
  );
};

export default Image;
