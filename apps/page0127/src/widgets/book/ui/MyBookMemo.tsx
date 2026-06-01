import { Star } from 'lucide-react';

// FSD: widgets는 app을 import할 수 없다 (역방향)
// → app/api/_helpers의 헬퍼는 NextResponse 의존(=route 전용)이라 widget에서 부적합
// → shared의 createClient를 직접 호출하고, user 조회는 인라인으로 처리
import { createClient } from '@/shared/config/supabase/server';
import { Card, CardContent } from '@/shared/ui/card';

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
    <div className='space-y-6'>
      <h2 className='text-xl font-bold'>나의 기록</h2>
      <Card className='shadow-none'>
        <CardContent className='p-6 space-y-4'>
          {/* Status & Rating */}
          <div className='flex items-center gap-4'>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                myBook.status === 'completed'
                  ? 'bg-chart-3/15 text-chart-3'
                  : myBook.status === 'reading'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {myBook.status === 'completed'
                ? '완독함'
                : myBook.status === 'reading'
                  ? '읽는 중'
                  : '읽고 싶은 책'}
            </span>

            {myBook.rating !== null && (
              <div className='flex items-center gap-1 text-yellow-500'>
                <Star className='fill-current w-4 h-4' />
                <span className='font-bold'>{myBook.rating}</span>
              </div>
            )}
          </div>

          {/* One Line Review */}
          {myBook.one_line_review && (
            <div className='p-4 bg-accent rounded-lg border-l-4 border-primary'>
              <p className='font-medium text-foreground'>
                &ldquo;{myBook.one_line_review}&rdquo;
              </p>
            </div>
          )}

          {/* Memo */}
          {myBook.personal_memo && (
            <div className='text-sm text-muted-foreground space-y-1'>
              <p className='font-semibold text-foreground'>메모</p>
              <p className='whitespace-pre-wrap'>{myBook.personal_memo}</p>
            </div>
          )}

          {/* Tags */}
          {myBook.tags && myBook.tags.length > 0 && (
            <div className='flex flex-wrap gap-2 pt-2'>
              {myBook.tags.map((tag) => (
                <span
                  key={tag}
                  className='text-xs px-2 py-1 bg-muted text-muted-foreground rounded'
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Empty State message if nothing recorded */}
          {!myBook.one_line_review && !myBook.personal_memo && (
            <p className='text-sm text-muted-foreground italic'>
              아직 기록된 내용이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
