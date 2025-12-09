'use client';

import type { CategoryReadingData } from '@/entities/book/types/stats';

type CategoryFilterProps = {
  /** 카테고리별 독서량 데이터 */
  categories: CategoryReadingData[];

  /** 현재 선택된 카테고리 */
  selectedCategory: string | null;

  /** 카테고리 선택 핸들러 */
  onSelectCategory: (category: string | null) => void;
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
 *   selectedCategory={selectedCategory}
 *   onSelectCategory={setSelectedCategory}
 * />
 */
export const CategoryFilter = ({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) => {
  return (
    <div className='mb-6'>
      <h3 className='mb-3 text-sm font-semibold text-gray-700'>
        카테고리별 독서량
      </h3>
      <div className='flex flex-wrap gap-2'>
        {/* All 버튼 */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>

        {/* 카테고리 Chip (count > 0인 것만 표시) */}
        {categories
          .filter((cat) => cat.count > 0)
          .map((cat) => (
            <button
              key={cat.category}
              onClick={() => onSelectCategory(cat.category)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === cat.category
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.category}{' '}
              <span className='ml-1 text-xs opacity-70'>({cat.count})</span>
            </button>
          ))}
      </div>
    </div>
  );
};
