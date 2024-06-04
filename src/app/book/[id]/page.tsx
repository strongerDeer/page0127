'use client';
import { COLLECTIONS } from '@constants';
import { Book } from '@models/Book';
import { getBook } from '@remote/book';
import Image from 'next/image';
import { useQuery } from 'react-query';

import FixedBottomButton from '@components/FixedBottomButton';
import { motion } from 'framer-motion';

export default function Page({ params }: { params: { id: string } }) {
  const { id = '' } = params;
  const { data } = useQuery([COLLECTIONS.BOOKS, id], () => getBook(id), {
    enabled: id !== '',
  });

  if (!data) {
    return null;
  }

  const {
    pubDate,
    readUser,
    title,
    category,
    readUserCount,
    categoryName,
    description,

    author,
    publisher,

    createdTime,
    lastUpdatedTime,
    readDate,

    frontCover,
    flipCover,

    grade,
    grade10User,
  } = data as Book;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, translateY: '50%' }}
        whileInView={{ opacity: 1, translateY: '0%' }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex">
          <Image src={flipCover} width={10} height={100} alt="" />
          <Image src={frontCover} width={100} height={100} alt="" />
        </div>
      </motion.div>
      <h2>{title}</h2>
      <p>{category}</p>
      <p>{categoryName}</p>
      <p>{author}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>{description}</p>
      <p>출판일: {pubDate}</p>
      <p>출판사: {publisher}</p>

      <p>{readUser}</p>

      <p>😀{readUserCount}</p>

      <p>{author}</p>
      {/* <p>{createdTime}</p>
        <p>{lastUpdatedTime}</p>
        <p>{readDate}</p> */}

      <p>😀{grade}</p>
      <p>😀{grade10User}</p>

      <FixedBottomButton text="신청" onClick={() => {}} />
    </div>
  );
}
