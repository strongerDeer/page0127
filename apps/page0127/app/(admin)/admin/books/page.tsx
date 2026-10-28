import Link from 'next/link';

import { Button, Input } from '@repo/ui';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { quotePostgrestValue } from '@/shared/lib/postgrestFilter';

import {
  type BookReview,
  REVIEW_COLUMNS,
  REVIEW_LABELS,
  type ReviewStatus,
  safeSourceUrl,
} from '@/features/book-review/model/review';
import { ReviewDecisionForm } from '@/features/book-review/ui/ReviewForms';

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await assertAdmin();
  const params = await searchParams;
  const status = Object.hasOwn(REVIEW_LABELS, params.status ?? '')
    ? (params.status as ReviewStatus)
    : 'pending';
  const q = (params.q ?? '').trim().slice(0, 200);
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.page ?? '1', 10) || 1)
  );
  const client = createAdminClient();
  let query = client
    .from('global_books')
    .select(REVIEW_COLUMNS, { count: 'exact' })
    .eq('source', 'manual')
    .eq('review_status', status);
  if (q) {
    const pattern = quotePostgrestValue(`%${q}%`);
    query = query.or(
      `title.ilike.${pattern},author.ilike.${pattern},isbn.ilike.${pattern}`
    );
  }
  const { data, error, count } = await query
    .order('created_at', { ascending: true })
    .range((page - 1) * 20, page * 20 - 1);
  if (error)
    throw new Error(
      '도서 검수 목록을 불러오지 못했습니다. DB 마이그레이션 적용 여부를 확인해 주세요.'
    );
  const books = (data ?? []) as BookReview[];
  const { data: history, error: historyError } = books.length
    ? await client
        .from('book_review_history')
        .select('id,global_book_id,decision,note,created_at')
        .in(
          'global_book_id',
          books.map((book) => book.id)
        )
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [], error: null };
  if (historyError) throw new Error('검수 이력을 불러오지 못했습니다.');
  return (
    <section className='space-y-5'>
      <div>
        <h1 className='text-base font-medium'>도서 등록 검수</h1>
        <p className='mt-2 text-sm text-text-subtle'>
          실제 책인지, 제목·저자·출처가 일치하는지, 중복이나 부적절한 내용이
          없는지 확인해 주세요. 확인되지 않는 정보는 보완 요청으로 남길 수
          있어요.
        </p>
      </div>
      <nav aria-label='검수 상태' className='flex flex-wrap gap-2'>
        {Object.entries(REVIEW_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/books?status=${key}`}
            aria-current={key === status ? 'page' : undefined}
            className={`rounded-lg border px-3 py-2 text-sm ${key === status ? 'border-primary text-primary' : 'border-line'}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form className='flex gap-2'>
        <input type='hidden' name='status' value={status} />
        <Input
          aria-label='제목·저자·ISBN 검색'
          name='q'
          defaultValue={q}
          placeholder='제목·저자·ISBN 검색'
        />
        <Button>검색</Button>
      </form>
      <p className='text-sm text-text-subtle'>
        {REVIEW_LABELS[status]} {count ?? 0}건 · {page}페이지
      </p>
      {!books.length && (
        <p className='py-8 text-sm text-text-subtle'>
          해당하는 등록 요청이 없어요.
        </p>
      )}
      {books.map((book) => {
        const link = safeSourceUrl(book.source_url);
        return (
          <article
            key={`${book.id}-${book.review_version}`}
            className='space-y-4 rounded-xl border border-line p-4'
          >
            <div>
              <h2 className='font-medium'>{book.title}</h2>
              <p className='text-sm text-text-subtle'>
                {book.author || '저자 미입력'} ·{' '}
                {book.publisher || '출판사 미입력'}
              </p>
            </div>
            <dl className='space-y-1 text-sm'>
              <div>
                ISBN:{' '}
                {book.isbn.startsWith('manual:')
                  ? '없음 · 직접 등록 식별자로 관리'
                  : book.isbn}
              </div>
              <div>
                등록:{' '}
                {new Date(book.created_at).toLocaleDateString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                })}
              </div>
              <div>등록자: {book.submitted_by ?? '탈퇴한 사용자'}</div>
            </dl>
            <div className='flex flex-wrap gap-4 text-sm text-primary'>
              {link && (
                <a
                  href={link}
                  target='_blank'
                  rel='noopener noreferrer nofollow'
                >
                  제출한 출처 확인 ↗
                </a>
              )}
              <a
                href={`https://www.yes24.com/product/search?query=${encodeURIComponent(book.isbn.startsWith('manual:') ? `${book.title} ${book.author ?? ''}` : book.isbn)}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                YES24에서 대조 ↗
              </a>
              <Link
                href={`/books/all?q=${encodeURIComponent(book.title)}`}
                target='_blank'
              >
                기존 공용 도서 중복 확인 ↗
              </Link>
            </div>
            {book.review_note && (
              <p className='rounded-lg bg-sunken p-3 text-sm'>
                최근 검수: {book.review_note}
              </p>
            )}
            <ReviewDecisionForm book={book} />
            <details className='text-sm'>
              <summary className='cursor-pointer text-text-subtle'>
                검수 이력
              </summary>
              <ul className='mt-2 space-y-2'>
                {(history ?? [])
                  .filter((item) => item.global_book_id === book.id)
                  .map((item) => (
                    <li key={item.id}>
                      {REVIEW_LABELS[item.decision as ReviewStatus]} ·{' '}
                      {new Date(item.created_at).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                      })}
                      {item.note ? ` · ${item.note}` : ''}
                    </li>
                  ))}
              </ul>
            </details>
          </article>
        );
      })}
      <nav
        aria-label='검수 목록 페이지'
        className='flex justify-between text-sm text-primary'
      >
        {page > 1 ? (
          <Link
            href={`/admin/books?${new URLSearchParams({ status, q, page: String(page - 1) })}`}
          >
            이전
          </Link>
        ) : (
          <span />
        )}
        {page * 20 < (count ?? 0) && (
          <Link
            href={`/admin/books?${new URLSearchParams({ status, q, page: String(page + 1) })}`}
          >
            다음
          </Link>
        )}
      </nav>
    </section>
  );
}
