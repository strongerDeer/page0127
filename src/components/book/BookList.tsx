'use client';

import { motion } from 'framer-motion';

import { Book } from '@models/book';

import BookListItem from './BookListItem';
import useLikeBook from '@connect/like/useLikeBook';

export default function BookList({ data }: { data: Book[] }) {
  const { data: likeBooks } = useLikeBook();

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
              isLike={likeBooks?.includes(item.id)}
              {...item}
            />
          </motion.li>
        ))}
      </ul>
    </>
  );
}
