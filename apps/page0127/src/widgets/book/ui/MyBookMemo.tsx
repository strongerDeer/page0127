import { Star } from 'lucide-react';

// FSD: widgets는 app을 import할 수 없다 (역방향)
// → app/api/_helpers의 헬퍼는 NextResponse 의존(=route 전용)이라 widget에서 부적합
// → shared의 createClient를 직접 호출하고, user 조회는 인라인으로 처리
import { createClient } from '@/shared/config/supabase/server';

import { Book } from '@/entities/book';

type MyBookMemoProps = {
  isbn: string;
};

export const MyBookMemo = async ({ isbn }: MyBookMemoProps) => {
  const supabase = await createClient();
  // route handler용 NextResponse 분기가 필요 없으므로 supabase.auth를 직접 사용
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .eq('isbn', isbn)
    .single();

  if (!book) return null; // Not in library, nothing to show

  const myBook = book as Book;

  return (
    <section>
      <h2 className='heading-2 text-text-strong'>나의 기록</h2>

      {/* 플랫 sunken 모듈 — 내 기록은 페이지 안의 "메모지" 면 */}
      <div className='mt-3 space-y-4 rounded-2xl bg-sunken p-5 md:p-6'>
        {/* 상태 · 별점 */}
        <div className='flex items-center gap-3'>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              myBook.status === 'completed'
                ? 'bg-primary text-primary-foreground'
                : myBook.status === 'reading'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-card text-text-subtle'
            }`}
          >
            {myBook.status === 'completed'
              ? '완독함'
              : myBook.status === 'reading'
                ? '읽는 중'
                : '읽고 싶은 책'}
          </span>

          {myBook.rating !== null && (
            <span className='flex items-center gap-1 text-sm font-semibold text-text-strong'>
              <Star
                aria-hidden='true'
                className='size-4 fill-chart-4 text-chart-4'
              />
              {myBook.rating}
            </span>
          )}
        </div>

        {/* 한줄평 — 파란 인용 박스 대신 큰 본문으로. 유저의 문장이 주인공이다 */}
        {myBook.one_line_review && (
          <p className='break-keep text-[17px] font-medium leading-relaxed text-text-strong'>
            &ldquo;{myBook.one_line_review}&rdquo;
          </p>
        )}

        {/* Memo */}
        {myBook.personal_memo && (
          <div className='space-y-1 text-sm'>
            <p className='font-semibold text-text-strong'>메모</p>
            <p className='whitespace-pre-wrap break-keep text-text-body'>
              {myBook.personal_memo}
            </p>
          </div>
        )}

        {/* Tags */}
        {myBook.tags && myBook.tags.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {myBook.tags.map((tag) => (
              <span
                key={tag}
                className='rounded-full bg-card px-2.5 py-1 text-xs text-text-body'
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Empty State message if nothing recorded */}
        {!myBook.one_line_review && !myBook.personal_memo && (
          <p className='text-sm text-text-subtle'>
            아직 남긴 기록이 없어요. 한 줄이면 충분합니다.
          </p>
        )}
      </div>
    </section>
  );
};
