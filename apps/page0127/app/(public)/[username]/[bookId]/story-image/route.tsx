import { BookStoryCard } from '@/shared/lib/og/BookStoryCard';
import { renderOg } from '@/shared/lib/og/render';
import { STORY_SIZE } from '@/shared/lib/og/theme';

import { isRated } from '@/entities/book';
import { getPublicBookRecord } from '@/entities/book/api/getPublicBookRecord';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

import { toStoryAddress } from '@/widgets/public-library/model/storyCard';

// 책 한 권 스토리 이미지 (1080×1920) — 책 기록 페이지 공유 시트의 "이미지 공유하기"가 받아 간다.
// 공유 카드(opengraph-image)와 같은 조회·같은 공개 규칙, 크기와 틀만 다르다.
//
// runtime 을 지정하지 않는다 = Node.js 런타임 (opengraph-image.tsx 와 같은 이유 —
// next/og 번들이 Edge 1MB 한도를 넘는다). 캐시 헤더는 renderOg 가 붙인다(1시간).

type Context = { params: Promise<{ username: string; bookId: string }> };

export const GET = async (_request: Request, { params }: Context) => {
  const { username, bookId } = await params;

  // 익명 조회만 쓴다 — 소유자가 불러도 비공개 기록은 그리지 않는다(getPublicBookRecord 주석)
  let name: string | null = null;
  let photoUrl: string | null = null;
  let book: Awaited<ReturnType<typeof getPublicBookRecord>> = null;
  try {
    const profile = await getPublicProfileByUsername(username);
    if (profile) {
      name = toDisplayName(profile);
      photoUrl = profile.photo_url;
      book = await getPublicBookRecord(profile.id, bookId);
    }
  } catch (error) {
    console.error('책 스토리 이미지 조회 실패:', error);
    return new Response('조회 실패', { status: 500 });
  }
  if (!book || !name) return new Response('없는 기록', { status: 404 });

  return renderOg(
    <BookStoryCard
      photoUrl={photoUrl}
      name={name}
      address={toStoryAddress(process.env.NEXT_PUBLIC_SITE_URL, username)}
      // 부제(' - ' 뒤)는 뗀다 — 페이지 제목(page.tsx generateMetadata)과 같은 규칙
      title={book.title.split(' - ')[0]}
      author={book.author}
      cover={book.cover_image}
      score={isRated(book.rating) ? book.rating : null}
      isLifeBook={book.is_life_book}
      review={book.one_line_review?.trim() || null}
    />,
    STORY_SIZE
  );
};
