import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './BookDetail.module.scss';
import { Book } from '@connect/book';
import LifeUsers from './LifeUsers';
import {
  ModalContextValue,
  ModalProps,
  useModalContext,
} from '@contexts/ModalContext';
import { toast } from 'react-toastify';
import useUser from '@connect/user/useUser';
import { useRouter } from 'next/navigation';
import { removeMyBook } from '@connect/mybook/mybook';
import ScrollProgressBar from '@components/shared/ScrollProgressBar';
import LikeButton from './LikeButton';
import useLikeBook from '@connect/like/useLikeBook';
import { format } from 'date-fns';
import clsx from 'clsx';
import Button from '@components/shared/Button';
import Icon from '@components/icon/Icon';
import useBook from '@hooks/useBook';
import MyReview from './MyReview';
export default function MyBookDetail({
  userId,
  bookId,
  data,
}: {
  userId: string;
  bookId: string;
  data: Book;
}) {
  const router = useRouter();
  const user = useUser();
  const { open: modalOpen, close: modalClose } =
    useModalContext() as ModalContextValue;
  const { data: likeBooks } = useLikeBook();
  const {
    frontCover,
    grade,
    readUser,

    memo,
    readDate,
    // flipCover,
    // createdTime,
    // lastUpdatedTime,
  } = data;

  const { data: bookData } = useBook({ id: bookId });

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
                {user?.uid && (
                  <LikeButton
                    bookId={user?.uid}
                    isLike={likeBooks?.includes(user.uid) || false}
                    showText
                  />
                )}
              </div>
            </div>

            <div className={styles.bookInfo}>
              <h2>{bookData?.title}</h2>
              {bookData?.subTitle && <h3>{bookData?.subTitle}</h3>}
              <p>{bookData?.author}</p>

              <p>
                {bookData?.publisher}{' '}
                {bookData?.pubDate && format(bookData?.pubDate, 'yyyy.MM.dd')}
              </p>

              <div className={styles.box}>
                <div className={styles.inner}>
                  <p>
                    <span>분야</span>
                    {bookData?.category}
                  </p>

                  <p>
                    <span>페이지</span>
                    {bookData?.page}
                  </p>
                  <p>
                    <span>가격</span>
                    {bookData?.price}원
                  </p>
                </div>
              </div>

              <p className={styles.description}>{bookData?.description}</p>
            </div>
          </div>

          <section className={clsx('section', styles.myContents)}>
            <h3 className="sub_title">나의 메모</h3>
            <div className={styles.myWrap}>
              <p>
                {Number(grade) !== 10 ? (
                  <>
                    {'⭐️'.repeat(Number(grade))} {grade}점
                  </>
                ) : (
                  <>나의 인생책!</>
                )}
              </p>
              <p>완독일: {readDate}</p>
            </div>
            {memo && <p className={styles.memo}>{memo}</p>}
            <Button href={`/my/${bookId}/edit`}>수정하기</Button>
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
                      user?.uid as string,
                      bookId as string,
                      grade as string,
                    );
                    modalClose();
                    router.replace(`/shelf/${user?.userId}`);
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

          {readUser && <LifeUsers userIds={readUser} />}
          {user && user.uid && grade && (
            <button
              type="button"
              onClick={() => {
                modalOpen({
                  title: '읽은 책 삭제',
                  body: '책장에서 해당 책을 삭제하시겠습니까?',
                  buttonLabel: '삭제',
                  closeButtonLabel: '취소',
                  onButtonClick: () => {
                    removeMyBook(user.uid, bookId, grade as string);
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
              삭제
            </button>
          )}
          {bookId && <MyReview userId={userId} bookId={bookId} />}
        </div>
      </div>
    </>
  );
}
