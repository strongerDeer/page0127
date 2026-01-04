'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { Book } from '@/entities/book/types';

import { PublicLibraryFilter } from '@/features/public-library/ui/PublicLibraryFilter';
import { CategoryFilter } from '@/features/stats/ui/CategoryFilter';

import { mapToMainCategory } from '@/shared/lib/categoryMapper';

import styles from './PublicBookShelf.module.css';

/**
 * 공개 서재 책장 컴포넌트 (Client Component)
 *
 * 학습 포인트:
 * - 이미지 에러 처리: onError로 fallback 이미지 제공
 * - rating 5점, 10점 책: 표지(cover_image), 나머지: 책등(spine_image)
 * - hover 효과로 책이 살짝 올라오는 인터랙션
 * - 책장(shelf) 디자인: CSS Module로 기존 SCSS와 동일하게 구현
 * - 필터링: 검색, 상태, 정렬, 카테고리
 */
type PublicBookShelfProps = {
  books: Book[];
  username: string;
};

export const PublicBookShelf = ({ books, username }: PublicBookShelfProps) => {
  // 이미지 로드 실패 시 fallback 이미지 상태 관리
  const [imgSrc, setImgSrc] = useState<{ [key: string]: string }>({});

  // 필터 상태
  const [filters, setFilters] = useState({
    search: '',
    status: 'all' as 'all' | 'completed' | 'reading' | 'wish',
    sort: 'latest' as 'latest' | 'oldest' | 'rating',
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const onError = (bookId: string) => {
    setImgSrc((prev) => ({
      ...prev,
      [bookId]: '/images/no-book.jpg',
    }));
  };

  // 카테고리 통계 계산 (대분류로 매핑)
  const categories = useMemo(() => {
    const categoryMap = books.reduce(
      (acc, book) => {
        const mainCategory = mapToMainCategory(book.category);
        acc[mainCategory] = (acc[mainCategory] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count,
    }));
  }, [books]);

  // 필터링 및 정렬된 책 목록
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // 검색 필터
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(searchLower) ||
          (book.author && book.author.toLowerCase().includes(searchLower)),
      );
    }

    // 상태 필터
    if (filters.status !== 'all') {
      result = result.filter((book) => book.status === filters.status);
    }

    // 카테고리 필터 (대분류로 비교)
    if (selectedCategory) {
      result = result.filter(
        (book) => mapToMainCategory(book.category) === selectedCategory,
      );
    }

    // 정렬
    if (filters.sort === 'latest') {
      result.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );
    } else if (filters.sort === 'oldest') {
      result.sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime(),
      );
    } else if (filters.sort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [books, filters, selectedCategory]);

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">
        공개된 책 목록 ({filteredBooks.length})
      </h2>

      {books.length === 0 ? (
        <div className="rounded-lg border bg-gray-50 p-12 text-center">
          <p className="text-gray-500">아직 공개된 책이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 필터 */}
          <PublicLibraryFilter onFilterChange={setFilters} />

          {/* 카테고리 필터 */}
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* 책장 */}
          {filteredBooks.length === 0 ? (
            <div className="rounded-lg border bg-gray-50 p-12 text-center">
              <p className="text-gray-500">조건에 맞는 책이 없습니다.</p>
            </div>
          ) : (
            <div className={styles.shelf}>
              <ul className={styles.books}>
                {filteredBooks.map((book) => {
                  const isCoverView = book.rating === 5 || book.rating === 10;
                  const imageUrl = isCoverView
                    ? book.cover_image
                    : book.spine_image;
                  const hasImage = !!imageUrl;

                  return (
                    <li key={book.id}>
                      <Link href={`/${username}/${book.id}`}>
                        {hasImage ? (
                          <Image
                            src={imgSrc[book.id] || imageUrl}
                            alt={book.title}
                            width={isCoverView ? 170 : 50}
                            height={240}
                            sizes="(max-width: 768px) 170px, 170px"
                            onError={() => onError(book.id)}
                          />
                        ) : (
                          <div
                            className={`${styles.noImage} ${isCoverView ? styles.cover : styles.spine}`}
                          >
                            <p>{book.title}</p>
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};
