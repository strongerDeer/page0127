import Image from 'next/image';

import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

import { isLifeBook } from '@/entities/book';

import { savedBookMessage } from '../lib/savedBookMessage';

import type { BookRating } from '@/entities/book';

type BookSavedCardProps = {
  title: string;
  coverImage: string | null;
  /** 사용자가 남긴 한 문장. 없으면 인용 블록을 숨긴다 */
  oneLineReview: string | null;
  rating: BookRating | null;
  /** 완독 권수. 통계 조회 실패 시 null */
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
  rating,
  completedCount,
  readCount,
  onGoToLibrary,
  onRecordAnother,
}: BookSavedCardProps) => (
  <Card>
    <CardContent className='space-y-6 py-8'>
      <div className='flex flex-col items-center gap-4 text-center'>
        {coverImage && (
          <Image
            src={coverImage}
            alt=''
            width={120}
            height={174}
            className='book-cover h-auto w-[120px]'
          />
        )}

        {/* 카드는 라우트 이동이 아니라 state 교체로 나타나므로 아무것도 읽어주지 않는다.
            제출 버튼도 언마운트돼 포커스가 body 로 떨어진다 → 확인 문구만 라이브 리전으로 감싼다.
            role 을 h2 에 직접 주면 암시적 heading 역할이 덮여 제목 탐색에서 사라진다. */}
        <div role='status' className='space-y-1'>
          <h2 className='heading-2 text-text-strong'>
            {savedBookMessage(completedCount, readCount)}
          </h2>
          <p className='text-sm text-text-subtle'>{title}</p>
        </div>

        {isLifeBook(rating) && (
          <span className='rounded-full bg-chart-3/15 px-3 py-1 text-sm font-semibold text-chart-3'>
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
        <Button variant='outline' onClick={onRecordAnother} className='flex-1'>
          한 권 더 기록
        </Button>
      </div>
    </CardContent>
  </Card>
);
