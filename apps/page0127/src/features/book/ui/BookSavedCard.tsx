import { useEffect, useRef } from 'react';

import { Button } from '@repo/ui';
import { Card, CardContent } from '@repo/ui';
import { BookCover } from '@repo/ui';

import { savedBookMessage } from '../lib/savedBookMessage';

import type { BookRating } from '@/entities/book';

type BookSavedCardProps = {
  title: string;
  coverImage: string | null;
  /** 사용자가 남긴 한 문장. 없으면 인용 블록을 숨긴다 */
  oneLineReview: string | null;
  rating: BookRating | null;
  /** 인생책 여부 — rating 과 별개 컬럼이다 */
  isLifeBook: boolean;
  /** 완독 권수. 통계 조회에 실패했거나 재독이라 조회하지 않았으면 null */
  completedCount: number | null;
  /** 이 책을 몇 번째로 읽었는지 */
  readCount: number;
  onGoToLibrary: () => void;
  onRecordAnother: () => void;
};

/**
 * 저장 직후 보여주는 결과 카드.
 *
 * 이 트랙의 핵심은 "사용자가 방금 쓴 문장을 되돌려주는 것"이다 —
 * 저장하고 목록으로 사라지면 기록했다는 감각이 남지 않는다.
 * 표시만 하고 데이터 조회는 하지 않는다(호출부가 다 넘겨준다).
 */
export const BookSavedCard = ({
  title,
  coverImage,
  oneLineReview,
  rating: _rating,
  isLifeBook,
  completedCount,
  readCount,
  onGoToLibrary,
  onRecordAnother,
}: BookSavedCardProps) => {
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 라이브 리전을 내용과 함께 마운트하면 안 읽힐 수 있다(MDN: 빈 리전을 먼저 두고
    // 별도 단계로 내용을 바꾸는 것이 정석, 삽입 시점 안내 특례는 role='alert' 뿐).
    // 포커스를 옮기면 확실히 읽히고, 제출 버튼이 언마운트돼 body 로 떨어진
    // 키보드 포커스도 카드로 돌아온다.
    // preventScroll: 카드가 폼이 있던 자리를 그대로 차지하므로 스크롤을 건드릴 이유가 없다.
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <Card>
      <CardContent className='space-y-6 py-8'>
        <div className='flex flex-col items-center gap-4 text-center'>
          {/* 표지가 없으면 아무것도 그리지 않는다 — 저장 확인 카드라 빈 상자를
              세우지 않는다. 그래서 BookCover 의 대체 조판을 쓰지 않고 가드를 남긴다 */}
          {coverImage && (
            <BookCover
              src={coverImage}
              title={title}
              width={120}
              height={174}
              decorative
              className='h-auto w-[120px]'
            />
          )}

          {/* 카드는 라우트 이동이 아니라 state 교체로 나타나므로 아무것도 읽어주지 않는다.
              그래서 확인 문구만 라이브 리전으로 감싸고, 마운트 시 여기로 포커스를 옮긴다.
              role 을 h2 에 직접 주면 암시적 heading 역할이 덮여 제목 탐색에서 사라진다. */}
          <div
            ref={headingRef}
            tabIndex={-1}
            role='status'
            aria-live='polite'
            className='space-y-1'
          >
            <h2 className='heading-2'>
              {savedBookMessage(completedCount, readCount)}
            </h2>
            <p className='text-sm text-text-subtle'>{title}</p>
          </div>

          {isLifeBook && (
            <span className='rounded-full bg-chart-3/15 px-3 py-1 text-sm font-medium text-chart-3'>
              인생책
            </span>
          )}
        </div>

        {/* 사용자가 쓴 문장을 그대로 되돌려준다 — 이 카드의 존재 이유다 */}
        {oneLineReview && (
          <blockquote className='rounded-lg bg-sunken px-4 py-3 text-center text-text-body'>
            {oneLineReview}
          </blockquote>
        )}

        <div className='flex gap-3'>
          <Button onClick={onGoToLibrary} className='flex-1'>
            내 책장 보기
          </Button>
          <Button
            variant='outline'
            onClick={onRecordAnother}
            className='flex-1'
          >
            한 권 더 기록
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
