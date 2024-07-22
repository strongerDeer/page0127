import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './BookDetail.module.scss';
import { Book } from '@models/book';
import Review from './Review';
import LifeUsers from './LifeUsers';
export default function MyBookDetail({ data }: { data: Book }) {
  console.log(data);
  const {
    title,
    category,
    subTitle,
    pubDate,
    page,
    description,
    price,
    categoryName,
    publisher,
    author,
    frontCover,
    grade,
    readUser,

    memo,

    // id,
    // flipCover,
    // createdTime,
    // lastUpdatedTime,
  } = data;

  return (
    <>
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
              viewport={{ once: true }}
            >
              <Image src={frontCover} width={320} height={320} alt="" />
            </motion.div>
            <div className={styles.bookInfo}>
              <h2>{title}</h2>
              <h3>{subTitle}</h3>
              <p>{author}</p>
              <p>{publisher}</p>

              <p>
                {Number(grade) === 10
                  ? '인생책'
                  : `${'⭐️'.repeat(Number(grade))} ${grade}`}
              </p>
            </div>
          </div>

          <div className={styles.bookContents}>
            <p>{category}</p>
            <p>{categoryName}</p>
            <p>{description}</p>

            <p>출판일: {pubDate}</p>
            <p>page: {page}</p>
            <p>price: {price}</p>

            <p>{memo}</p>
          </div>
        </div>
      </div>

      {readUser && <LifeUsers userIds={readUser} />}
      <div className="h-[1000px]"></div>
      <Review />
    </>
  );
}
