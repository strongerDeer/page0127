import Link from 'next/link';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';

import { BookRankingList } from '@/widgets/book/ui/BookRankingList';

import type { BookRanking, GlobalBook } from '@/entities/book';

/**
 * 메인 랜딩 페이지
 *
 * 학습 포인트:
 * - Server Component Data Fetching
 * - Suspense & Streaming (추후 적용 가능)
 * - Supabase RPC 호출
 */
const Home = async () => {
  const supabase = await createClient();

  // 1. 인생책 (평점 10점) 조회
  const { data: booksOfLifeData } = await supabase.rpc('get_books_of_life', {
    limit_count: 5,
  });

  // 2. 완독왕 (가장 많이 읽은 책) 조회
  const { data: mostReadBooksData } = await supabase.rpc(
    'get_most_read_books',
    {
      limit_count: 5,
    }
  );

  // User Data Fetching for UI states
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myReadIsbns = new Set<string>();
  const myLikedIds = new Set<string>();

  if (user) {
    const { data: myBooks } = await supabase
      .from('books')
      .select('isbn')
      .eq('user_id', user.id)
      .eq('status', 'completed');
    if (myBooks)
      myBooks.forEach((b: { isbn: string | null }) => {
        if (b.isbn) myReadIsbns.add(b.isbn);
      });

    const { data: myLikes } = await supabase
      .from('book_likes')
      .select('book_id')
      .eq('user_id', user.id);
    if (myLikes)
      myLikes.forEach((l: { book_id: string }) => myLikedIds.add(l.book_id));
  }

  // RPC 결과는 JSONB → 런타임 모양만 타입으로 좁힌다.
  type RankingRow = { isbn: string; count: number; book_info: unknown };

  const booksOfLife: BookRanking[] = (booksOfLifeData || []).map(
    (item: RankingRow) => ({
      isbn: item.isbn,
      count: item.count,
      book_info: item.book_info as GlobalBook,
    })
  );

  const mostReadBooks: BookRanking[] = (mostReadBooksData || []).map(
    (item: RankingRow) => ({
      isbn: item.isbn,
      count: item.count,
      book_info: item.book_info as GlobalBook,
    })
  );

  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <section className='section-spacing pb-12 pt-20'>
        <div className='container mx-auto max-w-5xl px-4'>
          <div className='text-center'>
            <h1 className='heading-1 mb-6'>당신의 독서 DNA를 발견하세요</h1>
            <p className='heading-2 mb-8 text-gray-600'>
              AI 기반 독서 성향 분석 플랫폼
            </p>
            <div className='flex justify-center gap-4'>
              <Link href='/login'>
                <Button size='lg' className='px-8'>
                  무료로 시작하기
                </Button>
              </Link>
              <Link href='/books/all'>
                <Button size='lg' variant='outline' className='px-8'>
                  전체 도서 둘러보기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Rankings Section */}
      <div className='container mx-auto max-w-6xl px-4'>
        {/* 인생책 랭킹 */}
        {booksOfLife.length > 0 && (
          <BookRankingList
            title='🏆 독자들이 선택한 인생책'
            subTitle='가장 많은 10점 평점을 받은 명작들입니다.'
            books={booksOfLife}
            type='best'
            myReadIsbns={Array.from(myReadIsbns)}
            myLikedIds={Array.from(myLikedIds)}
          />
        )}

        <div className='h-8' />

        {/* 완독왕 랭킹 */}
        {mostReadBooks.length > 0 && (
          <BookRankingList
            title='🔥 가장 많이 완독한 책'
            subTitle='유저들이 끝까지 읽어낸 인기 도서입니다.'
            books={mostReadBooks}
            type='most'
            myReadIsbns={Array.from(myReadIsbns)}
            myLikedIds={Array.from(myLikedIds)}
          />
        )}
      </div>

      <div className='h-20' />

      {/* Features Section */}
      <section className='section-spacing bg-gray-50'>
        <div className='container mx-auto max-w-5xl px-4'>
          <h2 className='heading-2 mb-12 text-center'>주요 기능</h2>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
            <div className='rounded-lg bg-white p-6 shadow-sm'>
              <div className='mb-4 text-4xl'>📚</div>
              <h3 className='mb-2 text-xl font-bold'>독서 기록</h3>
              <p className='text-gray-600'>
                읽은 책을 기록하고 통계를 확인하세요
              </p>
            </div>
            <div className='rounded-lg bg-white p-6 shadow-sm'>
              <div className='mb-4 text-4xl'>🤖</div>
              <h3 className='mb-2 text-xl font-bold'>AI 분석</h3>
              <p className='text-gray-600'>
                독서 성향을 분석하고 맞춤 추천을 받으세요
              </p>
            </div>
            <div className='rounded-lg bg-white p-6 shadow-sm'>
              <div className='mb-4 text-4xl'>🎯</div>
              <h3 className='mb-2 text-xl font-bold'>목표 관리</h3>
              <p className='text-gray-600'>
                연간 독서 목표를 설정하고 달성하세요
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t bg-white py-8'>
        <div className='container mx-auto max-w-5xl px-4 text-center text-sm text-gray-600'>
          <p>© 2024 page0127. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
