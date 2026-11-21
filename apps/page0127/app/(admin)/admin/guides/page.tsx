import Link from 'next/link';

import { Button, Input } from '@repo/ui';

import {
  getAdminGuides,
  searchGuideBooks,
} from '@/features/admin-book-guides/api/getAdminGuides';

/**
 * 읽기 가이드 목록 — 만든 가이드 + 새 가이드를 붙일 책 찾기.
 * 검색은 GET 폼(?q=)이라 클라이언트 JS 없이 서버에서 찾는다.
 */
export default async function AdminGuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const [guides, hits] = await Promise.all([
    getAdminGuides(),
    searchGuideBooks(q),
  ]);

  return (
    <section className='flex flex-col gap-6'>
      <div>
        <h1 className='mb-1 text-base font-medium'>읽기 가이드</h1>
        <p className='text-xs text-text-subtle'>
          책 정보 페이지에 붙는 인물관계도·연표·산책 코스예요. 스포일러 없이
          초반 설정만 담아 주세요.
        </p>
      </div>

      <form className='flex max-w-md gap-2'>
        <Input
          name='q'
          defaultValue={q}
          placeholder='가이드를 붙일 책 제목·저자'
          aria-label='책 검색'
        />
        <Button type='submit' variant='outline'>
          찾기
        </Button>
      </form>

      {q && (
        <ul className='flex flex-col divide-y divide-line-soft rounded-xl border border-line'>
          {hits.length === 0 && (
            <li className='p-3 text-sm text-text-subtle'>
              전체 도서에 없는 책이에요. 먼저 도서로 등록해 주세요.
            </li>
          )}
          {hits.map((book) => (
            <li key={book.id}>
              <Link
                href={`/admin/guides/${book.id}`}
                className='flex items-center justify-between gap-2 p-3 text-sm hover:bg-accent'
              >
                <span>
                  <span className='font-medium'>{book.title}</span>
                  {book.author && (
                    <span className='ml-2 text-text-subtle'>{book.author}</span>
                  )}
                </span>
                <span className='text-xs text-text-subtle'>편집 →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h2 className='mb-2 text-sm font-medium'>만든 가이드</h2>
        {guides.length === 0 ? (
          <p className='text-sm text-text-subtle'>아직 없어요.</p>
        ) : (
          <ul className='flex flex-col divide-y divide-line-soft rounded-xl border border-line'>
            {guides.map((g) => (
              <li key={g.globalBookId}>
                <Link
                  href={`/admin/guides/${g.globalBookId}`}
                  className='flex items-center justify-between gap-2 p-3 text-sm hover:bg-accent'
                >
                  <span className='font-medium'>{g.title}</span>
                  <span className='text-xs text-text-subtle'>
                    {g.status === 'published' ? '발행됨' : '초안'} ·{' '}
                    {new Date(g.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
