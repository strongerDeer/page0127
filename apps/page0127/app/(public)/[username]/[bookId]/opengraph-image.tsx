import { ImageResponse } from 'next/og';

import { BookShelf } from '@/shared/lib/og/BookShelf';
import { CardFrame, Wordmark } from '@/shared/lib/og/CardFrame';
import { RatingStars } from '@/shared/lib/og/RatingStars';
import {
  BRAND_SPINES,
  OG_CACHE_CONTROL,
  OG_COLORS,
  OG_SIZE,
  textWidth,
  truncate,
} from '@/shared/lib/og/theme';

import { isLifeBook, isRated, toScore } from '@/entities/book';
import { getPublicBookRecord } from '@/entities/book/api/getPublicBookRecord';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

// 책 기록 한 건의 동적 OG — "누가, 무슨 책을, 뭐라고 읽었나"를 카드가 말하게 한다.
//
// runtime 을 지정하지 않는다(= Node.js). 'edge' 로 두면 next/og 번들(~2.4MB)이
// Vercel Hobby 의 Edge Function 1MB 한도를 넘겨 배포 단계에서만 실패한다.
// 한글 폰트도 번들하지 않는다 — 자세한 이유는 shared/lib/og/theme.ts 상단 참조.

export const alt = '책 기록 | page0127';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ username: string; bookId: string }>;
};

/** 폭 기준 상한 (한글 글자 수). 라틴 제목은 같은 값에서 두 배 가까이 들어간다 */
const TITLE_MAX_WIDTH = 26;
const AUTHOR_MAX_WIDTH = 20;
const REVIEW_MAX_WIDTH = 46;
const NAME_MAX_WIDTH = 14;

/**
 * 표지는 선반 위에 세워 둔다 — 책장 카드의 책등과 같은 바닥이다.
 * 카드 높이(630)에서 워드마크와 선반을 빼고 남는 만큼 키웠다. 작게 두면 워드마크와
 * 표지 사이에 150px 쯤 빈 띠가 생겨 카드가 아래로 처져 보인다.
 */
const COVER = { width: 292, height: 438 };

/**
 * 표지가 없을 때는 그 폭을 책등만큼으로 줄인다.
 * 292px 짜리 색면을 그대로 두면 카드의 1/4 이 단색 덩어리가 되는데,
 * 없는 정보가 자리만 크게 차지하는 셈이다. 좁은 책등은 "책"으로 읽히면서
 * 남는 폭을 제목과 한줄평에 넘겨준다.
 */
const SPINE_ONLY = { width: 116, height: 438 };

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
  if (!book) {
    return new ImageResponse(
      <CardFrame>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Wordmark />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 28,
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            <div>책장을 보면,</div>
            <div>그 사람이 보인다</div>
          </div>
        </div>
        <BookShelf spines={BRAND_SPINES} />
      </CardFrame>,
      { ...size, headers: { 'Cache-Control': OG_CACHE_CONTROL } }
    );
  }

  const lifeBook = isLifeBook(book.rating);
  const title = truncate(book.title, TITLE_MAX_WIDTH);

  return new ImageResponse(
    <CardFrame>
      <Wordmark />

      {/* 표지와 기록이 나란히 선반 위에 선다 — 책장 카드의 책등과 같은 바닥이다 */}
      <BookShelf spines={[]} minHeight={COVER.height}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            width: book.cover_image ? COVER.width : SPINE_ONLY.width,
            height: COVER.height,
            background: BRAND_SPINES[0].c,
            borderRadius: '4px 4px 0 0',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/*
              각인을 먼저 깔고 표지를 그 위에 덮는다. 표지 URL 이 죽어 있으면 satori 는
              500 을 내지 않고 **그림만 그리지 않으므로**(알라딘 URL 은 실제로 404 가
              되는 것이 있다), 표지가 있다고 적힌 책도 단색 덩어리가 될 수 있다.
              뒤에 깔린 각인이 드러나면 그 경우에도 책으로 읽힌다.
            */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div
              style={{
                width: SPINE_ONLY.width * 0.46,
                height: 4,
                background: OG_COLORS.paper,
                opacity: 0.5,
                marginBottom: 10,
              }}
            />
            <div
              style={{
                width: SPINE_ONLY.width * 0.28,
                height: 4,
                background: OG_COLORS.paper,
                opacity: 0.3,
              }}
            />
          </div>

          {book.cover_image && (
            <img
              src={book.cover_image}
              alt=''
              width={COVER.width}
              height={COVER.height}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                objectFit: 'cover',
              }}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            // 표지 높이 안에서 가운데 정렬 — 바닥에 맞추면 위쪽이 통째로 빈다
            justifyContent: 'center',
            flex: 1,
            height: COVER.height,
            paddingLeft: 48,
            // 오른쪽 끝까지 글자가 차면 카드가 답답하다
            paddingRight: 12,
            // 넘치면 잘라낸다 — 캔버스 밖으로 흐르면 글자가 겹쳐 보인다
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: textWidth(title) <= 14 ? 52 : 42,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>

          {book.author && (
            <div
              style={{
                display: 'flex',
                marginTop: 12,
                fontSize: 26,
                color: OG_COLORS.inkSoft,
              }}
            >
              {truncate(book.author, AUTHOR_MAX_WIDTH)}
            </div>
          )}

          {/* 별점 — 매기지 않았으면 줄 자체를 그리지 않는다(빈 별 5개는 0점으로 읽힌다) */}
          {isRated(book.rating) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: 20,
              }}
            >
              <RatingStars score={toScore(book.rating)} size={34} />
              {lifeBook && (
                <div
                  style={{
                    display: 'flex',
                    marginLeft: 16,
                    padding: '6px 16px',
                    borderRadius: 999,
                    background: OG_COLORS.gold,
                    color: OG_COLORS.ink,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  인생책
                </div>
              )}
            </div>
          )}

          {/* 사용자가 쓴 문장 — 이 카드의 존재 이유다 */}
          {book.one_line_review && (
            <div
              style={{
                display: 'flex',
                marginTop: 22,
                paddingLeft: 20,
                borderLeft: `4px solid ${OG_COLORS.skyDeep}`,
                fontSize: 27,
                lineHeight: 1.5,
                color: OG_COLORS.ink,
              }}
            >
              {truncate(book.one_line_review, REVIEW_MAX_WIDTH)}
            </div>
          )}

          {name && (
            <div
              style={{
                display: 'flex',
                marginTop: 24,
                fontSize: 24,
                color: OG_COLORS.inkSoft,
              }}
            >
              {truncate(name, NAME_MAX_WIDTH)}님의 책장
            </div>
          )}
        </div>
      </BookShelf>
    </CardFrame>,
    { ...size, headers: { 'Cache-Control': OG_CACHE_CONTROL } }
  );
};

export default Image;
