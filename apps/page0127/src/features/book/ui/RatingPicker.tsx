'use client';

import { useState } from 'react';

import { Heart, Star } from 'lucide-react';

import type { BookRating } from '@/entities/book';

import styles from './RatingPicker.module.css';

type RatingPickerProps = {
  rating: BookRating | undefined;
  isLifeBook: boolean;
  onChange: (rating: BookRating | 'life') => void;
  /** 바깥 라벨의 id — 버튼들을 "평가 점수" 그룹으로 묶어 읽히게 한다 */
  labelledBy: string;
};

const STARS = [1, 2, 3, 4, 5] as const;

const CAPTION: Record<BookRating, string> = {
  0: '점수 없이 기록만 남겨요',
  1: '아쉬웠어요',
  2: '그저 그랬어요',
  3: '괜찮았어요',
  4: '좋았어요',
  5: '최고였어요',
};

/**
 * 평가 점수 고르기 — 별 5개 + 0점·인생책 칩.
 *
 * - 별에 마우스를 올리면 그 별까지 미리 채워 보여 준다(hover 가능한 기기만).
 * - 고르면 채워진 별이 왼쪽부터 차례로 통통 튄다. 같은 점수를 다시 눌러도 튀도록
 *   popKey 를 올려 아이콘을 다시 마운트한다(CSS 애니메이션은 클래스가 그대로면 다시 안 돈다).
 * - 인생책은 최고점의 별칭이라 별 5개가 모두 하트 색으로 바뀐다.
 * - 움직임 줄이기 설정이면 애니메이션은 끄고 색 변화만 남긴다(module.css).
 */
export const RatingPicker = ({
  rating,
  isLifeBook,
  onChange,
  labelledBy,
}: RatingPickerProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [popKey, setPopKey] = useState(0);

  const select = (value: BookRating | 'life') => {
    setPopKey((k) => k + 1);
    // 누르는 순간 미리보기를 끈다 — 켜 둔 채면 마우스를 뗄 때까지 통통 튀는 애니메이션이
    // 안 보이고, 칩을 누를 땐 별 미리보기 문구가 결과를 가린다
    setHovered(null);
    onChange(value);
  };

  // 화면에 채워 보여 줄 별 개수 — 호버 중이면 미리보기가 이긴다
  const selectedStars = isLifeBook ? 5 : (rating ?? 0);
  const filledStars = hovered ?? selectedStars;
  const previewing = hovered !== null;

  const caption = previewing
    ? `${hovered}점 · ${CAPTION[hovered as BookRating]}`
    : isLifeBook
      ? '인생책 · 오래 곁에 둘 책이에요'
      : rating !== undefined
        ? `${rating}점 · ${CAPTION[rating]}`
        : '별을 눌러 점수를 남겨 보세요';

  const starColor =
    isLifeBook && !previewing
      ? 'fill-rose-500 text-rose-500'
      : 'fill-amber-400 text-amber-400';

  return (
    <div className='space-y-2'>
      <div
        role='group'
        aria-labelledby={labelledBy}
        className='flex flex-wrap items-center gap-x-3 gap-y-2'
      >
        <div
          className='flex items-center'
          onPointerLeave={() => setHovered(null)}
        >
          {STARS.map((score) => {
            const filled = score <= filledStars;
            const selected = !isLifeBook && rating === score;
            return (
              <button
                key={score}
                type='button'
                aria-label={`${score}점`}
                aria-pressed={selected}
                onClick={() => select(score)}
                onPointerEnter={(e) => {
                  // 터치는 hover 가 없다 — 손가락을 뗀 뒤에도 미리보기가 남지 않게 마우스만 받는다
                  if (e.pointerType === 'mouse') setHovered(score);
                }}
                className='rounded-md p-1 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-90'
              >
                <Star
                  key={filled && !previewing ? `pop-${popKey}` : 'idle'}
                  aria-hidden
                  strokeWidth={1.75}
                  style={{ animationDelay: `${(score - 1) * 45}ms` }}
                  className={`h-8 w-8 transition-colors ${
                    filled
                      ? starColor
                      : 'fill-transparent text-muted-foreground/40'
                  } ${filled && !previewing && popKey > 0 ? styles.pop : ''}`}
                />
              </button>
            );
          })}
        </div>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            aria-label='0점'
            aria-pressed={!isLifeBook && rating === 0}
            onClick={() => select(0)}
            className={`h-8 rounded-full border px-3 text-sm transition-colors motion-safe:active:scale-95 ${
              !isLifeBook && rating === 0
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-accent'
            }`}
          >
            0점
          </button>
          <button
            type='button'
            aria-label='인생책'
            aria-pressed={isLifeBook}
            onClick={() => select('life')}
            className={`relative inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors motion-safe:active:scale-95 ${
              isLifeBook
                ? 'border-rose-700 bg-rose-700 text-white'
                : 'border-rose-200 bg-card text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10'
            }`}
          >
            <Heart
              key={isLifeBook ? `beat-${popKey}` : 'idle'}
              aria-hidden
              className={`h-4 w-4 ${isLifeBook ? `fill-white ${styles.beat}` : ''}`}
            />
            인생책
            {isLifeBook && (
              <span
                key={`ring-${popKey}`}
                aria-hidden
                className={`${styles.ring} text-rose-400`}
              />
            )}
          </button>
        </div>
      </div>

      {/* 점수마다 한마디 — 숫자만 있을 때보다 고르는 맛이 있다. 바뀌면 스크린 리더에도 읽힌다 */}
      <p
        aria-live='polite'
        className={`text-sm transition-colors ${
          isLifeBook && !previewing
            ? 'font-medium text-rose-700 dark:text-rose-300'
            : rating !== undefined || previewing
              ? 'text-foreground'
              : 'text-muted-foreground'
        }`}
      >
        {caption}
      </p>
    </div>
  );
};
