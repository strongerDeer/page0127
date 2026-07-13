import Link from 'next/link';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/ui/pagination';

import { BookListItem } from '@/widgets/book/ui/BookListItem';

import type { GlobalBook } from '@/entities/book';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function GlobalBooksPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const limit = 20;
  const sort = (searchParams.sort as string) || 'created_at';
  const order = (searchParams.order as string) || 'desc';

  const supabase = await createClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Fetch User Data for UI states (Read/Liked) - Cached per request
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // global_books 목록은 user와 무관 → user별 쿼리(로그인 시에만)와 함께 병렬 페치
  const booksQuery = supabase
    .from('global_books')
    .select('*', { count: 'exact' })
    .order(sort, { ascending: order === 'asc' })
    .range(from, to);
  const myBooksQuery = user
    ? supabase
        .from('books')
        .select('isbn')
        .eq('user_id', user.id)
        .eq('status', 'completed')
    : null;
  const myLikesQuery = user
    ? supabase.from('book_likes').select('book_id').eq('user_id', user.id)
    : null;

  // Promise.all은 null을 그대로 통과시키므로 비로그인 시에도 안전
  const [booksRes, myBooksRes, myLikesRes] = await Promise.all([
    booksQuery,
    myBooksQuery,
    myLikesQuery,
  ]);

  const myReadIsbns = new Set<string>();
  const myLikedIds = new Set<string>();
  myBooksRes?.data?.forEach((b: { isbn: string }) => myReadIsbns.add(b.isbn));
  myLikesRes?.data?.forEach((l: { book_id: string }) =>
    myLikedIds.add(l.book_id)
  );

  const books = (booksRes.data as GlobalBook[]) || [];
  const totalPages = booksRes.count ? Math.ceil(booksRes.count / limit) : 0;

  return (
    <PageContainer width='wide'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='heading-1 text-text-strong'>전체 도서</h1>
          <p className='mt-1 text-sm text-text-subtle'>
            {booksRes.count
              ? `${booksRes.count.toLocaleString()}권이 등록돼 있어요.`
              : '아직 등록된 책이 없어요.'}
          </p>
        </div>

        {/* 정렬 옵션 (간단하게 구현) */}
        <div className='flex gap-2'>
          <Link href={`?sort=created_at&order=desc`}>
            <Button
              variant={sort === 'created_at' ? 'secondary' : 'ghost'}
              size='sm'
            >
              최신순
            </Button>
          </Link>
          <Link href={`?sort=title&order=asc`}>
            <Button
              variant={sort === 'title' ? 'secondary' : 'ghost'}
              size='sm'
            >
              제목순
            </Button>
          </Link>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
        {books.map((book) => (
          <BookListItem
            key={book.id}
            book={book}
            isReadProp={myReadIsbns.has(book.isbn)}
            isLikedProp={myLikedIds.has(book.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-12 flex justify-center'>
          <Pagination>
            <PaginationContent>
              {page > 1 && (
                <PaginationItem>
                  <PaginationPrevious href={`?page=${page - 1}&sort=${sort}`} />
                </PaginationItem>
              )}

              {/* 간단한 페이지네이션: 현재 페이지 주변만 표시하거나 전체 표시 (여기선 간단히) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1; // 1, 2, 3, 4, 5... (Logic needs improvement for large pages, but keeping simple)
                // Improved logic for sliding window could go here, but for now simple 1-5 or based on current
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href={`?page=${p}&sort=${sort}`}
                      isActive={page === p}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {page < totalPages && (
                <PaginationItem>
                  <PaginationNext href={`?page=${page + 1}&sort=${sort}`} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </PageContainer>
  );
}
