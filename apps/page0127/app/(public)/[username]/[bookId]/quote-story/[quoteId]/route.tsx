import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { QuoteStoryCard } from '@/shared/lib/og/QuoteStoryCard';
import { PRIVATE_IMAGE_CACHE_CONTROL, renderOg } from '@/shared/lib/og/render';
import { STORY_SIZE } from '@/shared/lib/og/theme';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

import { toStoryAddress } from '@/widgets/public-library/model/storyCard';

// 문장 카드 스토리 이미지 (1080×1920) — 책 상세 "내가 모은 문장"의 공유 버튼이 받아 간다.
//
// 문장은 "나만 보여요"다(book_quotes RLS 가 본인 행만 연다). 그래서 이 이미지는
// 로그인한 주인만 그릴 수 있고, 남이 주소를 알아도 404 다. 공개 스토리 이미지와 달리
// CDN 캐시에 올리지 않는다(PRIVATE_IMAGE_CACHE_CONTROL) — 올리면 남이 같은 주소로 받아 간다.
// 이미지를 저장해 올리는 것은 주인이 고른 공유라 괜찮다.
//
// runtime 을 지정하지 않는다 = Node.js 런타임 (story-image 와 같은 이유 — next/og 번들이 Edge 한도를 넘는다).

type Context = {
  params: Promise<{ username: string; bookId: string; quoteId: string }>;
};

const notFound = () =>
  new Response('없는 문장', {
    status: 404,
    headers: { 'Cache-Control': PRIVATE_IMAGE_CACHE_CONTROL },
  });

export const GET = async (_request: Request, { params }: Context) => {
  const { username, bookId, quoteId } = await params;

  try {
    const [user, profile] = await Promise.all([
      getCurrentUser(),
      getProfileByUsername(username),
    ]);
    // 주인만 — RLS 가 막아 주지만 주소의 username 과 로그인한 사람도 맞춘다(다층 방어)
    if (!user || !profile || user.id !== profile.id) return notFound();

    const supabase = await createClient();
    const { data: book } = await supabase
      .from('books')
      .select('isbn, title, author, cover_image')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!book) return notFound();

    // 문장은 기록(books.id)이 아니라 계정 + ISBN 에 붙는다 — 이 책의 문장인지까지 맞춘다
    const { data: quote } = await supabase
      .from('book_quotes')
      .select('text, page')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .eq('isbn', book.isbn)
      .maybeSingle();
    if (!quote) return notFound();

    return renderOg(
      <QuoteStoryCard
        photoUrl={profile.photo_url}
        name={toDisplayName(profile)}
        address={toStoryAddress(process.env.NEXT_PUBLIC_SITE_URL, username)}
        text={quote.text}
        page={quote.page}
        // 부제(' - ' 뒤)는 뗀다 — 책 스토리 이미지와 같은 규칙
        title={book.title.split(' - ')[0]}
        author={book.author}
        cover={book.cover_image}
      />,
      STORY_SIZE,
      PRIVATE_IMAGE_CACHE_CONTROL
    );
  } catch (error) {
    console.error('문장 카드 이미지 조회 실패:', error);
    return new Response('조회 실패', {
      status: 500,
      headers: { 'Cache-Control': PRIVATE_IMAGE_CACHE_CONTROL },
    });
  }
};
