import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './BookDetail.module.scss';
import { Book, Grade } from '@models/book';
import Review from './Review';
import LifeUsers from './LifeUsers';
import LikeButton from './LikeButton';
import useUser from '@hooks/auth/useUser';
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
    readUser,
    id,
    likeUsers,
    // flipCover,
    // createdTime,
    // lastUpdatedTime,
  } = data;

  const user = useUser();

  const scores = ['0', '1', '2', '3', '4', '5', '10'] as const;
  const grades = scores.map((score) => ({
    score,
    length: getGradeLength(grade, score),
  }));

  let length = 0;
  let sum = 0;

  grades.forEach(({ score, length: gradeLength }) => {
    length += gradeLength;
    sum += Number(score) * gradeLength;
  });

  const avg = length > 0 ? (sum / length).toFixed(2) : '0.00';

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
            <p>인생책: {getGradeLength(grade, '10')}</p>
          </div>

          {readUser && <LifeUsers userIds={readUser} />}

          {id && <LikeButton bookId={id} likeUsers={likeUsers} />}
          {user?.uid && readUser?.includes(user.uid) ? <>읽었어요!</> : <></>}
        </div>
      </div>
    </>
  );
}

function getGradeLength(grade: Book['grade'], score: keyof Grade): number {
  if (!grade) return 0;
  if (typeof grade === 'string') return 0;
  return grade[score]?.length ?? 0;
}
