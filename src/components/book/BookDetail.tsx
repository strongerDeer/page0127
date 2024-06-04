import { Book } from '@models/Book';
import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './BookDetail.module.scss';
export default function BookDetail({ data }: { data: Book }) {
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
    <div className={styles.bookDetail}>
      <div className={styles.bg}>
        <Image src={frontCover} width={100} height={100} alt="" />
      </div>
      <div className="max-width">
        <div className={styles.top}>
          <motion.div
            className={styles.bookImg}
            initial={{ opacity: 0, translateY: '50%' }}
            whileInView={{ opacity: 1, translateY: '0%' }}
            transition={{ duration: 0.3 }}
          >
            <Image src={frontCover} width={320} height={320} alt="" />
          </motion.div>
          <div className={styles.bookInfo}>
            <h2>{title}</h2>
            <p>{author}</p>
            <p>{publisher}</p>

            <p>⭐️⭐️⭐️⭐️⭐️{grade}</p>
          </div>
        </div>

        <div className={styles.bookContents}>
          <p>{categoryName}</p>
          <p>{description}</p>
          <p>{category}</p>

          <p>출판일: {pubDate}</p>
          <p>{readUser}</p>
          <p>😀{readUserCount}</p>

          {/* <p>{createdTime}</p>
      <p>{lastUpdatedTime}</p>
      <p>{readDate}</p> */}

          <p>😀{grade10User}</p>
        </div>
      </div>
    </div>
  );
}
