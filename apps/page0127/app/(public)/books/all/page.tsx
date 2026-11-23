import Link from 'next/link';

import { Button } from '@repo/ui';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@repo/ui';
import { PageContainer, PageHeader } from '@repo/ui';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { applyTokenSearch } from '@/shared/lib/tokenSearch';

import { catalogVisibilityFilter } from '@/entities/book/api/catalogVisibility';
import {
  type CatalogPage,
  getCachedCatalogPage,
} from '@/entities/book/api/getCachedCatalogPage';
import { toCatalogCacheKey } from '@/entities/book/model/catalogPageCache';

import { BookListItem } from '@/widgets/book/ui/BookListItem';

import { getBooksAllCanonical } from './canonical';

import type { GlobalBook } from '@/entities/book';
import type { Metadata } from 'next';

/** 첫 화면에 보이는 책 수(모바일 2열 × 2줄) — 이 표지들만 priority 로 먼저 받는다 */
const FIRST_SCREEN_BOOKS = 4;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 검색 결과에 뜨는 제목·설명.
 *
 * 지금까지는 루트 레이아웃 값을 그대로 써서 **랜딩과 똑같은 제목**으로 색인되고
 * 있었다. 같은 제목이 여러 개면 검색엔진이 어느 쪽을 보여줄지 못 고르고,
 * 사용자도 결과 목록에서 구분하지 못한다.
 *
 * 이 페이지는 로그인 없이 열리는 카탈로그라 SEO 자산 1순위다.
 */
export const generateMetadata = async (props: {
  searchParams: SearchParams;
}): Promise<Metadata> => {
  // 2페이지 이후는 자기 주소가 canonical — 이유는 canonical.ts 참고
  const canonical = getBooksAllCanonical(await props.searchParams);

  return {
    title: '전체 도서 | page0127.',
    description:
      'page0127.에 기록된 책을 한눈에 둘러보세요. 누가 이 책을 읽었고 어떤 문장을 남겼는지 볼 수 있어요.',
    alternates: { canonical },
    openGraph: {
      title: '전체 도서 | page0127.',
      description: 'page0127.에 기록된 책을 한눈에 둘러보세요.',
      url: canonical,
    },
    // 루트 레이아웃의 twitter 제목(홈 문구)이 물려 오지 않게 이 페이지 제목을 적는다
    twitter: {
      card: 'summary_large_image',
      title: '전체 도서 | page0127.',
      description: 'page0127.에 기록된 책을 한눈에 둘러보세요.',
    },
  };
};

export default async function GlobalBooksPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  // 한 페이지 개수는 격자 열 수(2·3·4·6) 모두로 나눠떨어져야 마지막 줄이 비지 않는다.
  // 서버는 화면 폭을 모르니 열 수에 맞춰 바꾸지 않고 공배수(24)로 고정한다.
  // 예전 20권은 6열에서 6+6+6+2 → 마지막 줄 4칸이 비었다(2026-11-16 HJ).
  const limit = 24;
  const sort = (searchParams.sort as string) || 'created_at';
  const order = (searchParams.order as string) || 'desc';
  // GNB 검색폼(GET /books/all?q=...)에서 넘어온 검색어.
  // 쉼표·괄호를 지우지 않는다 — 지우면 "세네카, 오늘을…" 같은 제목을 붙여 넣었을 때
  // DB 제목과 한 글자 달라져 0건이 된다. 필터 주입은 applyTokenSearch 의 따옴표 처리가 막는다.
  const q =
    typeof searchParams.q === 'string'
      ? searchParams.q.trim().slice(0, 200)
      : '';
  // 정렬·페이지 링크에 검색어를 유지시키는 쿼리 조각
  const qParam = q ? `&q=${encodeURIComponent(q)}` : '';

  const supabase = await createClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Fetch User Data for UI states (Read/Liked) - Cached per request
  const user = await getCurrentUser();

  // 비로그인 + 검색 없음 + 앞쪽 페이지 → 캐시된 목록(1시간, 책이 바뀌면 바로 버림).
  // DB 대기(약 0.9초)가 사라져 스켈레톤 다음 진짜 목록이 곧바로 뜬다 — LCP(저자 글자)가 여기 있다.
  // 이유와 캐시하지 않는 경우는 getCachedCatalogPage.ts · catalogPageCache.ts 참고.
  const cacheKey = toCatalogCacheKey({
    isLoggedIn: Boolean(user),
    q,
    page,
    sort,
    order,
    limit,
  });

  // global_books 목록은 user와 무관 → user별 쿼리(로그인 시에만)와 함께 병렬 페치
  let booksQuery = supabase
    .from('global_books')
    .select('*', {
      count: 'exact',
    })
    .eq('review_status', 'approved')
    // 직접 등록 책은 등록한 사람에게만
    .or(catalogVisibilityFilter(user?.id));
  // 검색어의 단어가 모두 (제목이나 저자에) 들어간 책 — "세네카 오늘", "한강 소년"도 찾는다
  booksQuery = applyTokenSearch(booksQuery, q, ['title', 'author']);
  booksQuery = booksQuery
    .order(sort, { ascending: order === 'asc' })
    .range(from, to);
  const myBooksQuery = user
    ? supabase
        .from('books')
        .select('isbn, status')
        .eq('user_id', user.id)
        // 완독은 접힘, 읽는 중은 책갈피 — 두 상태를 한 번에 가져온다
        .in('status', ['completed', 'reading'])
    : null;
  const myLikesQuery = user
    ? supabase.from('book_likes').select('book_id').eq('user_id', user.id)
    : null;

  // 캐시를 못 읽으면(데이터 캐시·DB 일시 오류) 그 요청만 바로 DB 에 묻는다
  const loadBooks = async (): Promise<CatalogPage> => {
    if (cacheKey) {
      try {
        return await getCachedCatalogPage(cacheKey);
      } catch (error) {
        console.error(
          '[books/all] 캐시 목록 실패, 직접 조회:',
          error instanceof Error ? error.message : error
        );
      }
    }
    const { data, count } = await booksQuery;
    return { books: (data as GlobalBook[] | null) ?? [], count };
  };

  // Promise.all은 null을 그대로 통과시키므로 비로그인 시에도 안전
  const [booksRes, myBooksRes, myLikesRes] = await Promise.all([
    loadBooks(),
    myBooksQuery,
    myLikesQuery,
  ]);

  const myReadIsbns = new Set<string>();
  const myReadingIsbns = new Set<string>();
  const myLikedIds = new Set<string>();
  myBooksRes?.data?.forEach((b: { isbn: string; status: string }) =>
    (b.status === 'completed' ? myReadIsbns : myReadingIsbns).add(b.isbn)
  );
  myLikesRes?.data?.forEach((l: { book_id: string }) =>
    myLikedIds.add(l.book_id)
  );

  const { books } = booksRes;
  const totalPages = booksRes.count ? Math.ceil(booksRes.count / limit) : 0;

  return (
    <PageContainer>
      <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <PageHeader
          className='min-w-0 flex-1 [overflow-wrap:anywhere]'
          title={q ? `'${q}' 검색 결과` : '전체 도서'}
          description={
            q
              ? `${(booksRes.count ?? 0).toLocaleString()}권을 찾았어요.`
              : booksRes.count
                ? `${booksRes.count.toLocaleString()}권이 등록돼 있어요.`
                : '아직 등록된 책이 없어요.'
          }
        />

        {/* 정렬 옵션 (간단하게 구현) */}
        <div className='flex shrink-0 gap-2'>
          <Link href={`?sort=created_at&order=desc${qParam}`}>
            <Button
              variant={sort === 'created_at' ? 'secondary' : 'ghost'}
              size='sm'
            >
              최신순
            </Button>
          </Link>
          <Link href={`?sort=title&order=asc${qParam}`}>
            <Button
              variant={sort === 'title' ? 'secondary' : 'ghost'}
              size='sm'
            >
              제목순
            </Button>
          </Link>
        </div>
      </div>

      {/* 검색 결과 없음 — 빈 화면은 다음 행동을 안내한다 */}
      {q && books.length === 0 && (
        <p className='rounded-lg border border-line bg-card px-6 py-16 text-center text-sm text-text-subtle [overflow-wrap:anywhere]'>
          {`'${q}'와 겹치는 제목이나 저자가 없어요. 다른 검색어로 다시 찾아보세요.`}
        </p>
      )}

      <div className='grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6'>
        {books.map((book, index) => (
          <BookListItem
            key={book.id}
            book={book}
            // 모바일 2열 기준 첫 화면 두 줄(4권)만 먼저 받는다 — LCP 표지가 여기 있다
            priority={index < FIRST_SCREEN_BOOKS}
            // 나머지 표지는 화면 가까이 와서 받는다 — 첫 표지에 대역폭을 몰아 준다
            deferOffscreenCover
            isReadProp={myReadIsbns.has(book.isbn)}
            isReadingProp={myReadingIsbns.has(book.isbn)}
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
                  <PaginationPrevious
                    href={`?page=${page - 1}&sort=${sort}${qParam}`}
                  />
                </PaginationItem>
              )}

              {/* 간단한 페이지네이션: 현재 페이지 주변만 표시하거나 전체 표시 (여기선 간단히) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1; // 1, 2, 3, 4, 5... (Logic needs improvement for large pages, but keeping simple)
                // Improved logic for sliding window could go here, but for now simple 1-5 or based on current
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href={`?page=${p}&sort=${sort}${qParam}`}
                      isActive={page === p}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {page < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    href={`?page=${page + 1}&sort=${sort}${qParam}`}
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </PageContainer>
  );
}
