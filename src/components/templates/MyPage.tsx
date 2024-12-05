'use client';

import BookList from '@components/book/BookList';
import useUser from '@connect/user/useUser';

import styles from './MyPage.module.scss';
import { useState } from 'react';

import useLikeBook from '@connect/like/useLikeBook';
import useFilteredBook from '@connect/book/useFilteredBook';
import useReadBooks from '@connect/book/useReadBooks';
import Loading from '@components/Loading';

const BOOKS_PER_PAGE = 12;

type SortOption = '등록순' | '이름순' | '출시일순';

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<'read' | 'like'>('read');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('등록순');
  const user = useUser();

  const { data: likeData } = useLikeBook();
  const { data: readBooksData, isLoading: isReadLoading } = useReadBooks({
    userId: user?.userId as string,
    page: currentPage,
    sortBy,
  });
  const { data: likedBooksData, isLoading: isLikeLoading } = useFilteredBook({
    like: likeData || [],
    page: currentPage,
    sortBy,
  });

  const totalPages =
    activeTab === 'read'
      ? readBooksData
        ? Math.ceil(readBooksData.total / BOOKS_PER_PAGE)
        : 0
      : likedBooksData
        ? Math.ceil(likedBooksData.total / BOOKS_PER_PAGE)
        : 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
    setCurrentPage(1);
  };

  const handleTabChange = (tab: 'read' | 'like') => {
    setActiveTab(tab);
    setCurrentPage(1); // 탭 변경 시 페이지 초기화
  };

  return (
    <div className={styles.myPage}>
      <div className={styles.tab}>
        <button
          type="button"
          className={activeTab === 'read' ? styles.active : ''}
          onClick={() => setActiveTab('read')}
        >
          읽은 책
        </button>
        <button
          type="button"
          className={activeTab === 'like' ? styles.active : ''}
          onClick={() => setActiveTab('like')}
        >
          좋아요
        </button>
      </div>

      <section className={styles.contents}>
        <h2>
          {activeTab === 'read'
            ? `지금까지 읽은 책 ${readBooksData?.total || 0}`
            : `좋아요한 책 ${likedBooksData?.total || 0}`}
        </h2>

        <select
          value={sortBy}
          onChange={handleSortChange}
          className={styles.sort}
        >
          <option value="등록순">등록순</option>
          <option value="이름순">이름순</option>
          <option value="출시일순">출시일순</option>
        </select>
        {isReadLoading || isLikeLoading ? (
          <Loading />
        ) : (
          <>
            <BookList
              myList
              data={
                activeTab === 'read'
                  ? readBooksData?.items || []
                  : likedBooksData?.items || []
              }
            />
            {totalPages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={page === currentPage ? styles.active : ''}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
