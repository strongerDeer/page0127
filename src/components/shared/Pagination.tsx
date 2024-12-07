import Icon from '@components/icon/Icon';
import styles from './Pagination.module.scss';

export default function Pagination({
  totalPages,
  currentPage,
  handlePageChange,
  displayCount = 5,
}: {
  totalPages: number;
  currentPage: number;
  handlePageChange: (page: number) => void;
  displayCount?: number;
}) {
  const startPage = Math.max(
    Math.min(
      currentPage - Math.floor(displayCount / 2),
      totalPages - displayCount + 1,
    ),
    1,
  );
  const endPage = Math.min(startPage + displayCount - 1, totalPages);
  console.log(startPage, endPage);
  return (
    <div className={styles.pagination}>
      {currentPage > 1 && (
        <>
          <button
            onClick={() => handlePageChange(1)}
            className={styles.control}
          >
            <Icon name="doubleLeft" color="grayLv3" size="2rem" />
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            className={styles.control}
          >
            <Icon name="left" color="grayLv3" size="2rem" />
          </button>
        </>
      )}

      {Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i,
      ).map((page) => (
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          className={page === currentPage ? styles.active : ''}
        >
          {page}
        </button>
      ))}
      {currentPage < totalPages && (
        <>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            className={styles.control}
          >
            <Icon name="right" color="grayLv3" size="2rem" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            className={styles.control}
          >
            <Icon name="doubleRight" color="grayLv3" size="2rem" />
          </button>
        </>
      )}
    </div>
  );
}
