'use client';

import { motion } from 'framer-motion';

import { Book } from '@connect/book';

import BookListItem from './BookListItem';
import useLikeBook from '@connect/like/useLikeBook';
import Button from '@components/shared/Button';
import styles from './BookList.module.scss';
import { ROUTES } from '@constants';
export default function BookList({
  data,
  myList,
}: {
  data: Book[];
  myList?: boolean;
}) {
  const { data: likeBooks } = useLikeBook();

  if (data.length === 0) {
    return (
      <div>
        <p>책이 없어요. 더 많은 책을 살펴보세요!</p>
        <Button href={ROUTES.BOOK} variant="outline">
          더 많은 책 보러가기
        </Button>
      </div>
    );
  }
  return (
    <>
      {/* {data && <>{data.length}권</>} */}

      <ul className={styles.grid}>
        {data?.map((item, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, translateY: '20%' }}
            animate={{ opacity: 1, translateY: '0%' }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <BookListItem
              myList={myList}
              index={index}
              isLike={likeBooks?.includes(item.id as string) || false}
              {...item}
            />
          </motion.li>
        ))}
      </ul>
    </>
  );
}
