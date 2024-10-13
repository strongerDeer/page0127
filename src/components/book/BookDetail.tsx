import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './BookDetail.module.scss';
import { Book, Grade } from '@connect/book';
import Review from './Review';
import LifeUsers from './LifeUsers';
import LikeButton from './LikeButton';
import { format } from 'date-fns';
import useMyBook from './useMyBook';
import clsx from 'clsx';
import Link from 'next/link';
import ScrollProgressBar from '@components/shared/ScrollProgressBar';
import useUser from '@connect/user/useUser';
import useLikeBook from '@connect/like/useLikeBook';
import Button from '@components/shared/Button';
import Icon from '@components/icon/Icon';

import { toast } from 'react-toastify';
import {
  ModalContextValue,
  ModalProps,
  useModalContext,
} from '@contexts/ModalContext';
import { useRouter } from 'next/navigation';
import { removeMyBook } from '@connect/mybook/mybook';

export default function BookDetail({ data }: { data: Book }) {
  const router = useRouter();

  const { open: modalOpen, close: modalClose } =
    useModalContext() as ModalContextValue;
  const { data: likeBooks } = useLikeBook();
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

    // flipCover,
    // createdTime,
    // lastUpdatedTime,
  } = data;

  const user = useUser();

  const { data: myBook } = useMyBook({
    userId: user?.userId as string,
    bookId: id as string,
  });

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
        <ScrollProgressBar />
        <div className={styles.bg}>
          <Image src={frontCover} width={100} height={100} alt="" priority />
        </div>
        <div className="max-width">
          <div className={styles.top}>
            <div className={styles.leftWrap}>
              <motion.div
                className={styles.bookImg}
                initial={{ opacity: 0, translateY: '50%' }}
                whileInView={{ opacity: 1, translateY: '0%' }}
                transition={{ duration: 0.3 }}
                viewport={{ once: true }}
              >
                <Image src={frontCover} width={320} height={320} alt="" />
              </motion.div>
              <div className={styles.buttons}>
                {id && (
                  <LikeButton
                    bookId={id}
                    isLike={likeBooks?.includes(id) || false}
                    showText
                  />
                )}
                {user && readUser?.includes(user.uid) ? (
                  <p>읽었어요!</p>
                ) : (
                  <Link
                    href={{ pathname: '/book/create', query: { bookId: id } }}
                    className={styles.createMyBook}
                  >
                    읽은 책 등록
                  </Link>
                )}
              </div>
            </div>

            <div className={styles.bookInfo}>
              <h2>{title}</h2>
              {subTitle && <h3>{subTitle}</h3>}
              <p>{author}</p>

              <p>
                {publisher} {pubDate && format(pubDate, 'yyyy.MM.dd')}
              </p>

              <div className={styles.box}>
                <div className={styles.inner}>
                  <p>
                    <span>분야</span>
                    {category}
                  </p>

                  <p>
                    <span>페이지</span>
                    {page}
                  </p>
                  <p>
                    <span>가격</span>
                    {price}원
                  </p>
                </div>
              </div>

              <p className={styles.description}>{description}</p>
            </div>
          </div>

          {user && readUser?.includes(user.uid) && (
            <section className={clsx('section', styles.myContents)}>
              <h3 className="sub_title">나의 메모</h3>
              <div className={styles.myWrap}>
                <p>
                  {Number(myBook?.grade) !== 10 ? (
                    <>
                      {'⭐️'.repeat(Number(myBook?.grade))} {myBook?.grade}점
                    </>
                  ) : (
                    <>나의 인생책!</>
                  )}
                </p>
                <p>완독일: {myBook?.readDate}</p>
              </div>
              {myBook?.memo && <p className={styles.memo}>{myBook?.memo}</p>}
              <Button href={`/my/${id}/edit`}>수정하기</Button>
              <Button
                variant="outline"
                color="error"
                onClick={() => {
                  modalOpen({
                    title: '읽은 책 삭제',
                    body: '책장에서 해당 책을 삭제하시겠습니까?',
                    buttonLabel: '삭제',
                    closeButtonLabel: '취소',
                    onButtonClick: () => {
                      removeMyBook(
                        user.uid,
                        id as string,
                        data,
                        myBook?.grade as string,
                      );
                      modalClose();
                      router.replace(`/shelf/${user.userId}`);
                      toast.success('책이 삭제되었습니다');
                    },
                    closeModal: () => {
                      modalClose();
                    },
                  } as ModalProps);
                }}
              >
                <Icon name="delete" color="error" />
                삭제
              </Button>
            </section>
          )}

          <section className="section">
            <h3 className="sub_title">
              이 책을 읽은 리더들 <span>{readUser?.length}</span>
            </h3>

            <p>평점: ⭐️⭐️⭐️⭐️⭐️{avg}</p>
          </section>

          {grade && grade[10] && (
            <section className="section">
              <h3 className="sub_title">
                이 책을 읽은 인생책으로 뽑은 리더들{' '}
                <span>{getGradeLength(grade, '10')}</span>
              </h3>
              <LifeUsers userIds={grade[10] as string[]} />
            </section>
          )}

          {id && <Review bookId={id} />}
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
