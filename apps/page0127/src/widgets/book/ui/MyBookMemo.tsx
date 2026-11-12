import { Star } from 'lucide-react';

import { isRated } from '@/entities/book';

import type { MyBookMemoData } from '../model/bookInfoMe';

type MyBookMemoProps = {
  /** 내 서재의 이 책 기록 */
  myBook: MyBookMemoData;
};

/**
 * 나의 기록 — 그리기만 한다.
 *
 * 예전엔 서버 컴포넌트가 직접 로그인·기록을 읽었는데, 책 정보 페이지를 CDN 에 캐시하면서
 * 로그인한 브라우저가 API 로 받아 이 컴포넌트로 그리게 바뀌었다(BookInfoPersonal).
 */
export const MyBookMemo = ({ myBook }: MyBookMemoProps) => {
  return (
    <section>
      <h2 className='heading-2'>나의 기록</h2>

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

          {/* 별 배지는 "평점이 있다"는 표시다 → 0("평가 안 함")이면 배지를 아예 걸지 않는다.
              인생책은 점수 대신 이름으로 부른다 */}
          {isRated(myBook.rating) && (
            <span className='flex items-center gap-1 text-sm font-medium text-text-strong'>
              <Star
                aria-hidden='true'
                className='size-4 fill-chart-4 text-chart-4'
              />
              {myBook.is_life_book ? '인생책' : myBook.rating}
            </span>
          )}
        </div>

        {/* 한줄평 — 파란 인용 박스 대신 큰 본문으로. 유저의 문장이 주인공이다 */}
        {myBook.one_line_review && (
          <p className='break-keep text-lg font-medium leading-relaxed text-text-strong'>
            &ldquo;{myBook.one_line_review}&rdquo;
          </p>
        )}

        {/* Memo */}
        {myBook.personal_memo && (
          <div className='space-y-1 text-sm'>
            <p className='font-medium text-text-strong'>메모</p>
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
