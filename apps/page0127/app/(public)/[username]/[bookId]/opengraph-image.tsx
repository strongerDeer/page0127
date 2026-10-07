import { RatingStars } from '@/shared/lib/og/RatingStars';
import { renderOg } from '@/shared/lib/og/render';
import {
  BrandStage,
  FEATURE_COLUMN_WIDTH,
  FeatureStage,
  StageBookTitle,
  StageCard,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE, truncate } from '@/shared/lib/og/theme';

import { isRated } from '@/entities/book';
import { getPublicBookRecord } from '@/entities/book/api/getPublicBookRecord';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

// 책 기록 한 건의 동적 OG — 표지 한 장과 "이 사람이 뭐라고 했나"를 무대에 세운다.
//
// 책 제목은 한줄평이 없을 때만 쓴다. 카톡이 바로 아래에 페이지 제목으로 책 제목을
// 보여 주기 때문이다. 대신 그 아래에는 없는 것 — 별점·인생책·한줄평 — 을 싣는다.
// 사용자가 쓴 문장이 이 카드의 존재 이유다.
//
// runtime 을 지정하지 않는다(= Node.js). 'edge' 로 두면 next/og 번들(~2.4MB)이
// Vercel Hobby 의 Edge Function 1MB 한도를 넘겨 배포 단계에서만 실패한다.
// 폰트는 shared/lib/og/render.tsx 가 붙인다 — 자세한 이유는 theme.ts 상단 참조.

export const alt = '책 기록 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ username: string; bookId: string }>;
};

/** 폭 기준 상한 (한글 글자 수). 한줄평은 글자 칸에서 두 줄 안쪽이다 */
const REVIEW_MAX_WIDTH = 36;
const NAME_MAX_WIDTH = 10;

const Image = async ({ params }: Props) => {
  const { username, bookId } = await params;

  let name: string | null = null;
  let book: Awaited<ReturnType<typeof getPublicBookRecord>> = null;

  // 조회가 실패해도 카드는 나가야 한다 — 미리보기가 없는 것보다 브랜드 카드가 낫다
  try {
    const profile = await getPublicProfileByUsername(username);

    if (profile) {
      name = toDisplayName(profile);
      book = await getPublicBookRecord(profile.id, bookId);
    }
  } catch (error) {
    console.error('책 기록 OG 조회 실패:', error);
  }

  // 비공개이거나 없는 기록 — 내용을 한 글자도 흘리지 않고 브랜드 카드로 떨어진다
  if (!book || !name) {
    return renderOg(<BrandStage cta='책장 구경하기' />);
  }

  // 변수에 담으면 타입 좁히기가 풀리므로 점수 자체를 null 여부로 들고 다닌다
  const score = isRated(book.rating) ? book.rating : null;
  const rated = score !== null;
  const hasBadgeRow = rated || book.is_life_book;
  const review = book.one_line_review?.trim();

  return renderOg(
    <StageCard cta={`${truncate(name, NAME_MAX_WIDTH)}님의 기록 보기`}>
      <FeatureStage cover={book.cover_image}>
        {/* 별점·인생책 — 매기지 않았으면 줄 자체를 그리지 않는다(빈 별 5개는 0점으로 읽힌다) */}
        {hasBadgeRow ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {score !== null ? (
              <RatingStars
                score={score}
                size={40}
                onColor={OG_COLORS.paper}
                offColor='rgba(255, 255, 255, 0.3)'
              />
            ) : null}
            {book.is_life_book ? (
              <div
                style={{
                  display: 'flex',
                  marginLeft: rated ? 18 : 0,
                  padding: '6px 18px',
                  borderRadius: 999,
                  // brand/accent — 카드에서 유일한 비(非)블루라 "특별하다"가 색으로 읽힌다
                  background: OG_COLORS.mint,
                  color: OG_COLORS.ink,
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                인생책
              </div>
            ) : null}
          </div>
        ) : null}

        {review ? (
          <div
            style={{
              display: 'flex',
              marginTop: hasBadgeRow ? 28 : 0,
              width: FEATURE_COLUMN_WIDTH,
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.45,
            }}
          >
            {`“${truncate(review, REVIEW_MAX_WIDTH)}”`}
          </div>
        ) : (
          // 한줄평이 없으면 무대가 비므로 그때만 책 제목을 쓴다
          <StageBookTitle
            title={book.title}
            author={book.author}
            marginTop={hasBadgeRow ? 28 : 0}
          />
        )}
      </FeatureStage>
    </StageCard>
  );
};

export default Image;
