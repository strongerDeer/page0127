import { Search } from 'lucide-react';

/**
 * GNB 검색창
 *
 * 학습 포인트:
 * - JS 없는 GET 폼 — action='/books/all' 로 제출하면 ?q=... 쿼리가 붙는다.
 *   라우터 훅이 필요 없어 Server Component 그대로 둘 수 있다.
 */
export const GnbSearch = () => {
  return (
    <form action='/books/all' role='search' className='relative w-full'>
      <Search
        aria-hidden='true'
        className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint'
      />
      <input
        type='search'
        name='q'
        placeholder='책 제목이나 저자를 검색해 보세요'
        aria-label='도서 검색'
        className='h-9 w-full rounded-full border border-line bg-sunken pl-9 pr-4 text-sm text-text-strong placeholder:text-text-faint focus:border-transparent focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/50'
      />
    </form>
  );
};
