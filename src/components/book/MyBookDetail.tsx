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
export default function MyBookDetail({ data }: { data: Book }) {
  const router = useRouter();
  const user = useUser();
  const { open: modalOpen, close: modalClose } =
    useModalContext() as ModalContextValue;
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

    id,
    // flipCover,
    // createdTime,
    // lastUpdatedTime,
  } = data;

  return (
    <>
      <div className={styles.bookDetail}>
        <div className={styles.bg}>
          <Image src={frontCover} width={100} height={100} alt="" priority />
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

          {readUser && <LifeUsers userIds={readUser} />}
          {user && user.uid && id && grade && (
            <button
              type="button"
              onClick={() => {
                modalOpen({
                  title: '읽은 책 삭제',
                  body: '책장에서 해당 책을 삭제하시겠습니까?',
                  buttonLabel: '삭제',
                  closeButtonLabel: '취소',
                  onButtonClick: () => {
                    removeMyBook(user.uid, id, data, grade as string);
                    modalClose();
                    router.replace(`/shelf/${user.showId}`);
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
        </div>
      </div>
    </>
  );
}
