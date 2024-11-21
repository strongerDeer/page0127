import { useCallback, useState, useMemo } from 'react';
import Input from '@components/form/Input';
import Button from '@components/shared/Button';
import ProfileImage from '@components/shared/ProfileImage';
import { Skeleton } from '@components/shared/Skeleton';
import useUser from '@connect/user/useUser';

import { differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

import styles from './Review.module.scss';
import Link from 'next/link';
import {
  ModalContextValue,
  ModalProps,
  useModalContext,
} from '@contexts/ModalContext';
import { toast } from 'react-toastify';
import CommentLikeButton from './CommentLikeButton';
import { useReview } from '@connect/review-book/useReview';

function formatRelativeTime(date: Date) {
  const now = new Date();

  const dayDiff = differenceInDays(now, date);

  if (dayDiff < 3) {
    const distance = formatDistanceToNow(date, {
      addSuffix: true,
      locale: ko,
    });
    return distance === '1분 미만 전' ? '방금 전' : distance;
  } else {
    return format(date, 'yyyy.MM.dd HH:mm', { locale: ko });
  }
}

export default function Review({ bookId }: { bookId: string }) {
  const user = useUser();
  const { data: reviews, isLoading, write, remove } = useReview({ bookId });
  const { open: modalOpen, close: modalClose } =
    useModalContext() as ModalContextValue;

  const [text, setText] = useState<string>('');

  const reviewRows = useCallback(() => {
    if (reviews?.length === 0) {
      return (
        <p className={styles.nodata}>
          아직 작성된 댓글이 없습니다. 첫 댓글을 작성해보세요!
        </p>
      );
    }
    return (
      <ul className={styles.reviewList}>
        {reviews?.map((review) => (
          <li key={review.id}>
            <div className={styles.profileLink}>
              <Link href={`/${review.userId}`}>
                <ProfileImage photoURL={review.photoURL || ''} width={40} />
              </Link>
              <Link href={`/${review.userId}`}>
                <p className={styles.displayName}>
                  {review.displayName} <span>{review.userId}</span>
                </p>
              </Link>

              <p className={styles.time}>
                {formatRelativeTime(review.createdAt)}
              </p>
            </div>
            <div className={styles.content}>
              <p>{review.text}</p>
            </div>

            <CommentLikeButton commentId={review.id} />
            {review.userId === user?.userId && (
              <button
                onClick={() => {
                  modalOpen({
                    title: '댓글 삭제',
                    body: '작성한 댓글을 삭제하시겠습니까?',
                    buttonLabel: '삭제',
                    closeButtonLabel: '취소',
                    onButtonClick: () => {
                      remove({ reviewId: review.id, bookId: review.bookId });
                      toast.success('댓글이 삭제되었습니다');
                      modalClose();
                    },
                    closeModal: () => {
                      modalClose();
                    },
                  } as ModalProps);
                }}
                className={styles.delButton}
              >
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }, [reviews, user?.userId, modalOpen, modalClose, remove]);

  return (
    <div className={styles.review}>
      <h2 className="sub_title">
        댓글 <span>{reviews?.length}</span>
      </h2>
      {isLoading ? (
        <>
          <Skeleton />
          <Skeleton />
        </>
      ) : (
        <>
          {user != null ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const success = await write(text);
                if (success === true) {
                  setText('');
                }
              }}
              className={styles.reviewForm}
            >
              <Input
                label="리뷰작성"
                value={text}
                setValue={setText}
                placeholder="책에대한 당신의 이야기를 남겨주세요!"
                hiddenLabel
              />
              <Button disabled={text === ''} type="submit">
                작성
              </Button>
            </form>
          ) : null}

          {reviewRows()}
        </>
      )}
    </div>
  );
}
