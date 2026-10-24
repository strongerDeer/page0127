'use client';

import { Star } from 'lucide-react';

import type { BookRating } from '../types';

/** 빠르게 고르는 별점 — 0점은 등록 폼에만 둔다("안 고름"과 헷갈리지 않게) */
export const QUICK_RATING_CHOICES = [
  1, 2, 3, 4, 5,
] as const satisfies readonly BookRating[];

type StarRatingInputProps = {
  /** 안 골랐으면 null */
  value: BookRating | null;
  onChange: (value: BookRating | null) => void;
  /** 스크린리더가 읽을 그룹 이름 — 예: "<책 제목> 별점" */
  label: string;
};

/**
 * 1~5점 별점 고르기. 같은 별을 다시 누르면 지운다 — 잘못 누른 별점을 되돌릴 길이 있어야 한다.
 * 맛보기 담기 직후 화면과 서재의 "별점 남기기" 창이 같이 쓴다.
 */
export const StarRatingInput = ({
  value,
  onChange,
  label,
}: StarRatingInputProps) => (
  <div role='group' aria-label={label} className='flex items-center gap-0.5'>
    {QUICK_RATING_CHOICES.map((score) => {
      const filled = value !== null && score <= value;
      return (
        <button
          key={score}
          type='button'
          aria-pressed={value === score}
          aria-label={`${score}점`}
          onClick={() => onChange(value === score ? null : score)}
          className='rounded-sm p-1 text-chart-6 transition-transform hover:scale-110'
        >
          <Star
            aria-hidden
            className={`size-6 ${filled ? 'fill-current' : 'text-line'}`}
          />
        </button>
      );
    })}
    <span className='ml-2 text-xs text-text-subtle'>
      {value === null ? '별점 안 고름' : `${value}점`}
    </span>
  </div>
);
