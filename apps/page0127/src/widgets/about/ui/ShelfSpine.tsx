'use client';

import { useState } from 'react';

import { isSpineShaped } from '@/entities/book/model/spineShape';
import { SPINE_TONE_COLORS, spineTone } from '@/entities/book/model/spineTone';

import { SafeCover } from './SafeCover';

import type { ShelfBook } from '../model/coverRows';

type ShelfSpineProps = {
  book: ShelfBook | null;
  /** 책이 없을 때 색을 고르는 자리 번호 */
  index: number;
  className?: string;
};

/**
 * 홈 케미 그림의 책등 한 권 — 책등 사진이 있으면 그것, 없으면 서재와 같은 색 + 세로 제목.
 *
 * 높이는 모두 같다 — 내 서재 책장(PublicBookShelf, 높이 240px 고정·폭은 원본 비율)과
 * 같은 규칙이어야 홈 그림이 실제 화면의 미리보기가 된다(2026-11-20 HJ).
 *
 * 클라이언트 컴포넌트인 이유: 불러온 이미지의 원본 비율을 재서(isSpineShaped)
 * 책등 자리에 앞표지가 든 YES24 이미지를 글자 책등으로 바꾼다 — load 이벤트가 있어야 한다.
 */
export const ShelfSpine = ({
  book,
  index,
  className = '',
}: ShelfSpineProps) => {
  const [notSpine, setNotSpine] = useState(false);

  const text = (
    <span
      className='flex h-full w-5 items-center justify-center overflow-hidden rounded-[2px] px-0.5 py-1.5 md:w-6'
      style={{
        backgroundColor:
          SPINE_TONE_COLORS[spineTone(book?.id ?? String(index))],
      }}
    >
      <span className='h-full overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-medium leading-tight text-[#1f1d1a] [writing-mode:vertical-rl]'>
        {book?.title ?? ''}
      </span>
    </span>
  );

  return (
    <span className={`h-full shrink-0 ${className}`}>
      {book?.spineImage && !notSpine ? (
        <SafeCover
          src={book.spineImage}
          small
          alt=''
          width={24}
          height={160}
          fallback={text}
          className='h-full w-auto rounded-[2px] object-contain'
          onLoad={(event) => {
            if (!isSpineShaped(event.currentTarget)) setNotSpine(true);
          }}
        />
      ) : (
        text
      )}
    </span>
  );
};
