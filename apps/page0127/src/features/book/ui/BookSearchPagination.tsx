'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/ui/pagination';

type BookSearchPaginationProps = {
  currentPage: number;
  totalResults: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
};

/**
 * 도서 검색 결과 Pagination 컴포넌트
 *
 * 학습 포인트:
 * - 복잡한 UI 로직을 별도 컴포넌트로 분리
 * - 페이지 번호 계산 및 ellipsis(...) 표시
 * - Props를 통한 상태 관리 위임
 */
export const BookSearchPagination = ({
  currentPage,
  totalResults,
  itemsPerPage,
  onPageChange,
}: BookSearchPaginationProps) => {
  const totalPages = Math.ceil(totalResults / itemsPerPage);

  // 표시할 페이지 번호 계산 (현재 페이지 기준 앞뒤 2개씩)
  const getPageNumbers = () => {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (page) => {
        return (
          page === 1 ||
          page === totalPages ||
          (page >= currentPage - 2 && page <= currentPage + 2)
        );
      }
    );
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className='flex justify-center pt-6'>
      <Pagination>
        <PaginationContent>
          {/* 이전 버튼 */}
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(currentPage - 1)}
              className={
                currentPage === 1
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>

          {/* 페이지 번호 */}
          {pageNumbers.map((page, index, array) => {
            const prevPage = array[index - 1];
            const showEllipsis = prevPage && page - prevPage > 1;

            return (
              <div key={page} className='flex items-center'>
                {showEllipsis && (
                  <span className='px-2 text-gray-500'>...</span>
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                    className='cursor-pointer'
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              </div>
            );
          })}

          {/* 다음 버튼 */}
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(currentPage + 1)}
              className={
                currentPage === totalPages
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
