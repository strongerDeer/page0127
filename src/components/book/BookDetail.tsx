import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './BookDetail.module.scss';
import { Book } from '@models/book';
export default function BookDetail({ data }: { data: Book }) {
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

    // id,
    // flipCover,
    // createdTime,
    // lastUpdatedTime,
  } = data;

  const scores = ['0', '1', '2', '3', '4', '5', '10'];
  const grades = scores.map((score: string) => ({
    score,
    length: grade[score] ? grade[score].length : 0,
  }));

  let length = 0;
  let sum = 0;

  grades.forEach(({ score, length: gradeLength }) => {
    length += gradeLength;
    sum += Number(score) * gradeLength;
  });

  const avg = sum / length;

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
            >
              <Image src={frontCover} width={320} height={320} alt="" />
            </motion.div>
            <div className={styles.bookInfo}>
              <h2>{title}</h2>
              <h3>{subTitle}</h3>
              <p>{author}</p>
              <p>{publisher}</p>

              <p>⭐️⭐️⭐️⭐️⭐️{avg}</p>
            </div>
          </div>

          <div className={styles.bookContents}>
            <p>{category}</p>
            <p>{categoryName}</p>
            <p>{description}</p>

            <p>출판일: {pubDate}</p>
            <p>page: {page}</p>
            <p>price: {price}</p>
            <p>인생책: {grade['10'] ? grade['10'].length : 0}</p>
          </div>
        </div>
      </div>
    </>
  );
}
