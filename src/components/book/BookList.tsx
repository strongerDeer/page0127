'use client';

import { motion } from 'framer-motion';

import { Book } from '@connect/book';

import BookListItem from './BookListItem';
import useLikeBook from '@connect/like/useLikeBook';
import Button from '@components/shared/Button';

export default function BookList({ data }: { data: Book[] }) {
  const { data: likeBooks } = useLikeBook();

  if (data.length === 0) {
    return (
      <div>
        <p>책이 없어요. 더 많은 책을 살펴보세요!</p>
        <Button href="/book" variant="outline">
          더 많은 책 보러가기
        </Button>
      </div>
    );
  }
  return (
    <>
      {data && <>{data.length}권</>}

      <ul className="grid grid-cols-4 gap-16">
        {data?.map((item, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, translateY: '20%' }}
            animate={{ opacity: 1, translateY: '0%' }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <BookListItem
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
