import { ImageResponse } from 'next/og';

import { RatingStars } from '@/shared/lib/og/RatingStars';
import {
  BOOK_SPINES,
  OG_CACHE_CONTROL,
  OG_COLORS,
  OG_SIZE,
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

/** 제목 2줄, 저자 1줄, 한줄평 2줄에 들어갈 만큼만 남긴다 */
const TITLE_MAX = 28;
const AUTHOR_MAX = 24;
const REVIEW_MAX = 60;

/** 화면(224×320)보다 크게 잡는다 — 630px 캔버스에서 320px 표지는 카드가 비어 보인다 */
const COVER = { width: 280, height: 400 };

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
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: OG_COLORS.ink,
          color: OG_COLORS.paper,
          fontFamily: 'sans-serif',
          padding: '64px 72px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, opacity: 0.65 }}>
          page0127
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          책장을 보면, 그 사람이 보인다
        </div>
      </div>,
      { ...size, headers: { 'Cache-Control': OG_CACHE_CONTROL } }
    );
  }

  const lifeBook = isLifeBook(book.rating);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 48,
        background: OG_COLORS.ink,
        color: OG_COLORS.paper,
        fontFamily: 'sans-serif',
        padding: '64px 72px',
      }}
    >
      {/*
        좌: 표지.

        색면을 컨테이너 배경으로 깔고 그 위에 표지를 얹는다. 표지 URL 이 죽어 있으면
        satori 는 500 을 내지 않고 **그림만 그리지 않는다** — 그러면 이 자리가 텅 빈
        채로 카드가 나가므로(알라딘 URL 은 실제로 404 가 되는 것이 있다),
        뒤에 깔린 색면이 그대로 보이게 해서 책 모양이 남도록 했다.
      */}
      <div
        style={{
          display: 'flex',
          width: COVER.width,
          height: COVER.height,
          background: BOOK_SPINES[0].c,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {book.cover_image && (
          <img
            src={book.cover_image}
            alt=''
            width={COVER.width}
            height={COVER.height}
            style={{ objectFit: 'cover' }}
          />
        )}
      </div>

      {/* 우: 무슨 책을, 어떻게 읽었나 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          // 넘치면 잘라낸다 — 캔버스 밖으로 흐르면 글자가 겹쳐 보인다
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {truncate(book.title, TITLE_MAX)}
        </div>

        {book.author && (
          <div
            style={{
              display: 'flex',
              marginTop: 12,
              fontSize: 26,
              opacity: 0.7,
            }}
          >
            {truncate(book.author, AUTHOR_MAX)}
          </div>
        )}

        {/* 별점 — 매기지 않았으면 줄 자체를 그리지 않는다(빈 별 5개는 0점으로 읽힌다) */}
        {isRated(book.rating) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 20,
            }}
          >
            <RatingStars score={toScore(book.rating)} />
            {lifeBook && (
              <div
                style={{
                  display: 'flex',
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: OG_COLORS.gold,
                  color: OG_COLORS.ink,
                  fontSize: 24,
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
              marginTop: 24,
              paddingLeft: 20,
              borderLeft: `4px solid ${OG_COLORS.paper}`,
              fontSize: 28,
              lineHeight: 1.5,
              opacity: 0.9,
            }}
          >
            {truncate(book.one_line_review, REVIEW_MAX)}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 24,
            opacity: 0.55,
          }}
        >
          {name ? `${truncate(name, 12)}님의 책장 · page0127` : 'page0127'}
        </div>
      </div>
    </div>,
    { ...size, headers: { 'Cache-Control': OG_CACHE_CONTROL } }
  );
};

export default Image;
