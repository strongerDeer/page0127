'use client';

import { motion } from 'framer-motion';

import useBooks from '@hooks/useBooks';
import { Book } from '@models/book';

import BookListItem from './BookListItem';

export default function BookList() {
  const { data } = useBooks();
  if (!data) {
    return null;
  }

  return (
    <>
      {data && <>{data.length}권</>}

      <ul className="grid grid-cols-4 gap-16">
        {data.map((item: Book, index: number) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, translateY: '20%' }}
            animate={{ opacity: 1, translateY: '0%' }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <BookListItem index={index} {...item} />
          </motion.li>
        ))}
      </ul>
    </>
  );
}
