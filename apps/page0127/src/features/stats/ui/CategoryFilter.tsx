'use client';

import { Check } from 'lucide-react';

import type { CategoryReadingData } from '@/entities/book';

type CategoryFilterProps = {
  /** 카테고리별 독서량 데이터 */
  categories: CategoryReadingData[];

  /** 현재 선택된 카테고리들 */
  selectedCategories: string[];

  /** 카테고리 다중 선택 변경 핸들러 */
  onSelectionChange: (categories: string[]) => void;
};

/**
 * 카테고리 필터 Chip 컴포넌트
 *
 * 학습 포인트:
 * - 클릭 가능한 Chip 형태의 필터 UI
 * - "All" 버튼으로 전체 보기
 * - 레이더 차트 대신 직관적인 필터링 제공
 *
 * @example
 * <CategoryFilter
 *   categories={stats.categoryReading}
 *   selectedCategories={selectedCategories}
 *   onSelectionChange={setSelectedCategories}
 * />
 */
export const CategoryFilter = ({
  categories,
  selectedCategories,
  onSelectionChange,
}: CategoryFilterProps) => {
  const availableCategories = categories.filter((cat) => cat.count > 0);

  const toggleCategory = (category: string) => {
    const nextCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((selected) => selected !== category)
      : [...selectedCategories, category];

    // 모든 카테고리를 고른 결과는 필터가 없는 "전체"와 같다.
    onSelectionChange(
      nextCategories.length === availableCategories.length
        ? []
        : nextCategories
    );
  };

  return (
    <div className='mb-5 flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-4'>
      {/* 라벨은 칩과 같은 줄에 — 별도 헤딩을 세우면 필터가 섹션처럼 무거워진다 */}
      <span className='mr-1 text-[13px] text-text-subtle'>
        카테고리
        {selectedCategories.length > 0 && ` · ${selectedCategories.length}`}
      </span>

      <button
        onClick={() => onSelectionChange([])}
        aria-pressed={selectedCategories.length === 0}
        className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
          selectedCategories.length === 0
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-line bg-card text-text-body hover:border-text-faint hover:bg-sunken'
        }`}
      >
        전체
      </button>

      {/* 카테고리 Chip (count > 0인 것만 표시) */}
      {availableCategories.map((cat) => (
        <button
          key={cat.category}
          onClick={() => toggleCategory(cat.category)}
          aria-pressed={selectedCategories.includes(cat.category)}
          className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
            selectedCategories.includes(cat.category)
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-line bg-card text-text-body hover:border-text-faint hover:bg-sunken'
          }`}
        >
          {selectedCategories.includes(cat.category) && (
            <Check className='mr-1 inline h-3.5 w-3.5' />
          )}
          {cat.category}
          <span className='ml-1 text-xs opacity-60'>{cat.count}</span>
        </button>
      ))}
    </div>
  );
};
