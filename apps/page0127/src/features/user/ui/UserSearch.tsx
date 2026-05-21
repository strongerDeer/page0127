'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';

import { Input } from '@/shared/ui/input';

import { userApi, userKeys } from '@/entities/user';

import { UserCard } from '@/features/follow/ui/UserCard';

/**
 * 사용자 검색 컴포넌트
 *
 * 학습 포인트:
 * - debounce 없이 검색 버튼 클릭 방식
 * - React Query enabled 옵션으로 조건부 쿼리 실행
 * - 검색어 초기화 기능
 */
type UserSearchProps = {
  currentUserId?: string; // 현재 로그인한 사용자 ID
};

export const UserSearch = ({ currentUserId }: UserSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: userKeys.search(activeQuery),
    queryFn: () => userApi.searchUsers(activeQuery),
    enabled: activeQuery.trim().length > 0,
  });

  const handleSearch = () => {
    if (searchQuery.trim().length > 0) {
      setActiveQuery(searchQuery.trim());
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setActiveQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className='space-y-4'>
      {/* 검색 입력 */}
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
          <Input
            type='text'
            placeholder='사용자 검색 (닉네임 또는 사용자명)'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className='pl-10 pr-10'
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searchQuery.trim().length === 0 || isLoading}
          className='rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
        >
          검색
        </button>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
        </div>
      )}

      {/* 검색 결과 */}
      {!isLoading && activeQuery && (
        <div className='space-y-2'>
          <p className='text-sm text-gray-600'>
            &quot;{activeQuery}&quot; 검색 결과 ({users.length}명)
          </p>

          {users.length === 0 ? (
            <div className='rounded-lg border border-gray-200 bg-gray-50 py-12 text-center'>
              <p className='text-gray-500'>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 초기 상태 */}
      {!activeQuery && !isLoading && (
        <div className='rounded-lg border border-gray-200 bg-gray-50 py-12 text-center'>
          <Search className='mx-auto h-12 w-12 text-gray-400' />
          <p className='mt-4 text-gray-500'>
            닉네임 또는 사용자명으로 검색해보세요
          </p>
        </div>
      )}
    </div>
  );
};
