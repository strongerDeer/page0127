import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BookCover, PageContainer } from '@repo/ui';

import { createClient } from '@/shared/config/supabase/server';

import {
  type BookReview,
  REVIEW_COLUMNS,
  REVIEW_LABELS,
} from '@/features/book-review/model/review';
import { SubmissionEditForm } from '@/features/book-review/ui/ReviewForms';

export default async function BookRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect('/login');
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const { data, error, count } = await client
    .from('global_books')
    .select(REVIEW_COLUMNS, { count: 'exact' })
    .eq('submitted_by', user.id)
    .eq('source', 'manual')
    .order('created_at', { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error('등록 요청을 불러오지 못했습니다.');
  return (
    <PageContainer>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='heading-1'>내 등록 요청</h1>
        <Link href='/books/add' className='text-sm text-primary'>
          책 등록하기
        </Link>
      </div>
      <p className='mb-5 text-sm text-text-subtle'>
        직접 등록한 책은 바로 기록할 수 있어요. 승인 전에는 나에게만 보이며,
        승인 후에는 내가 선택한 공개 설정이 적용됩니다. 올린 표지 사진도 함께
        확인해요.
      </p>
      <div className='space-y-4'>
        {!data?.length && (
          <p className='py-8 text-sm text-text-subtle'>
            직접 등록한 책이 아직 없어요.
          </p>
        )}
        {((data ?? []) as BookReview[]).map((book) => (
          <article
            key={`${book.id}-${book.review_version}`}
            className='space-y-3 rounded-xl border border-line p-4'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='flex gap-3'>
                <BookCover
                  src={book.cover_image}
                  title={book.title}
                  size='sm'
                  decorative
                />
                <div>
                  <h2 className='font-medium'>{book.title}</h2>
                  <p className='text-sm text-text-subtle'>
                    {book.author} · {book.publisher || '출판사 미입력'}
                  </p>
                </div>
              </div>
              <span className='shrink-0 rounded-full bg-sunken px-3 py-1 text-xs'>
                {REVIEW_LABELS[book.review_status]}
              </span>
            </div>
            {!book.isbn.startsWith('manual:') && (
              <p className='text-xs text-text-subtle'>ISBN {book.isbn}</p>
            )}
            {book.review_note && (
              <p className='rounded-lg bg-sunken p-3 text-sm'>
                운영자 안내: {book.review_note}
              </p>
            )}
            {book.review_status !== 'approved' && (
              <details>
                <summary className='cursor-pointer text-sm text-primary'>
                  정보 보완·수정하기
                </summary>
                <div className='mt-3'>
                  <SubmissionEditForm book={book} />
                </div>
              </details>
            )}
          </article>
        ))}
      </div>
      <nav
        aria-label='등록 요청 페이지'
        className='mt-5 flex justify-between text-sm text-primary'
      >
        {page > 1 ? (
          <Link href={`/books/requests?page=${page - 1}`}>이전</Link>
        ) : (
          <span />
        )}
        {page * 20 < (count ?? 0) && (
          <Link href={`/books/requests?page=${page + 1}`}>다음</Link>
        )}
      </nav>
    </PageContainer>
  );
}
