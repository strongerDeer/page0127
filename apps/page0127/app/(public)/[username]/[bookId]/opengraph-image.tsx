import { ImageResponse } from 'next/og';

import { CardFrame, Wordmark } from '@/shared/lib/og/CardFrame';
import { RatingStars } from '@/shared/lib/og/RatingStars';
import {
  OG_CACHE_CONTROL,
  OG_COLORS,
  OG_SIZE,
  textWidth,
  truncate,
} from '@/shared/lib/og/theme';

import { isRated } from '@/entities/book';
import { getPublicBookRecord } from '@/entities/book/api/getPublicBookRecord';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

// 책 기록 한 건의 동적 OG — "누가, 무슨 책을, 뭐라고 읽었나"를 카드가 말하게 한다.
//
// **이 카드만 가로 2단이다.** 홈·책장 카드는 세로 가운데 정렬인데 여기만 다른 이유는,
// 담아야 할 것이 표지·제목·저자·별점·인생책·한줄평·기록자로 일곱 가지이기 때문이다.
// 세로로 쌓으면 상하 여백 72px 을 지킬 수 없고, 줄이려면 한줄평을 버려야 한다 —
// 사용자가 쓴 문장이 이 카드의 존재 이유라 그쪽을 포기할 수 없다.
// 대신 흰 배경·블루 팔레트·심볼 워드마크는 세 카드가 공유해 톤은 같다.
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
 * 표지 크기.
 *
 * 카드 높이 630 에서 상하 여백 72×2 와 워드마크(34 + 간격 24)를 빼면 428 이 남는다.
 * 414 는 그 안에 들어가는 가장 큰 값이다 — 이전 438 은 **여백을 14px 잡아먹어**
 * 워드마크가 위로 밀려 잘렸다.
 */
const COVER = { width: 276, height: 414 };

/**
 * 표지가 없을 때는 그 폭을 책등만큼으로 줄인다.
 * 276px 짜리 색면을 그대로 두면 카드의 1/4 이 단색 덩어리가 되는데,
 * 없는 정보가 자리만 크게 차지하는 셈이다. 좁은 책등은 "책"으로 읽히면서
 * 남는 폭을 제목과 한줄평에 넘겨준다.
 */
const SPINE_ONLY = { width: 110, height: 414 };

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
        <Wordmark size={46} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 24,
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          <div>책장을 보면,</div>
          <div>그 사람이 보인다</div>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 27,
            color: OG_COLORS.inkSoft,
          }}
        >
          한 권씩 채우면, 취향이 보입니다
        </div>
      </CardFrame>,
      { ...size, headers: { 'Cache-Control': OG_CACHE_CONTROL } }
    );
  }

  const lifeBook = book.is_life_book;
  const title = truncate(book.title, TITLE_MAX_WIDTH);

  return new ImageResponse(
    // 표지가 주인공이라 배경 책장은 얕은 띠로 물러난다
    <CardFrame compact>
      <Wordmark size={34} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 24,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            width: book.cover_image ? COVER.width : SPINE_ONLY.width,
            height: COVER.height,
            // brand/shelf-1 — 배경 책장의 가장 진한 책등과 같은 색
            background: OG_COLORS.accentDeep,
            borderRadius: 4,
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
              <RatingStars score={book.rating} size={34} />
              {lifeBook && (
                <div
                  style={{
                    display: 'flex',
                    marginLeft: 16,
                    padding: '6px 16px',
                    borderRadius: 999,
                    // brand/accent — 카드에서 유일한 비(非)블루라 "특별하다"가 색으로 읽힌다
                    background: OG_COLORS.mint,
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
                borderLeft: `4px solid ${OG_COLORS.accentDeep}`,
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
      </div>
    </CardFrame>,
    { ...size, headers: { 'Cache-Control': OG_CACHE_CONTROL } }
  );
};

export default Image;
