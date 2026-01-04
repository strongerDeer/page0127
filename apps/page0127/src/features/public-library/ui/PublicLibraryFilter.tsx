'use client';

import { useState } from 'react';

import { Search } from 'lucide-react';

/**
 * 공개 서재 필터 컴포넌트
 *
 * 학습 포인트:
 * - 검색, 상태 필터, 정렬을 하나의 컴포넌트로 관리
 * - onChange 콜백으로 부모에게 필터 상태 전달
 */

type FilterStatus = 'all' | 'completed' | 'reading' | 'wish';
type SortOption = 'latest' | 'oldest' | 'rating';

type PublicLibraryFilterProps = {
  onFilterChange: (filters: {
    search: string;
    status: FilterStatus;
    sort: SortOption;
  }) => void;
};

export const PublicLibraryFilter = ({
  onFilterChange,
}: PublicLibraryFilterProps) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FilterStatus>('all');
  const [sort, setSort] = useState<SortOption>('latest');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ search: value, status, sort });
  };

  const handleStatusChange = (value: FilterStatus) => {
    setStatus(value);
    onFilterChange({ search, status: value, sort });
  };

  const handleSortChange = (value: SortOption) => {
    setSort(value);
    onFilterChange({ search, status, sort: value });
  };

  return (
    <div className="mb-6 space-y-4">
      {/* 검색창 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="제목이나 저자로 검색하세요"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* 상태 필터 & 정렬 */}
      <div className="flex items-center justify-between">
        {/* 상태 탭 */}
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusChange('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              status === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => handleStatusChange('completed')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              status === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            완독
          </button>
          <button
            onClick={() => handleStatusChange('reading')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              status === 'reading'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            읽는 중
          </button>
          <button
            onClick={() => handleStatusChange('wish')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              status === 'wish'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            읽고 싶은
          </button>
        </div>

        {/* 정렬 */}
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value as SortOption)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="latest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="rating">평점순</option>
        </select>
      </div>
    </div>
  );
};
