import Icon from '@components/icon/Icon';

import { useCallback, useState } from 'react';
import styles from './LikeButton.module.scss';
import clsx from 'clsx';
import useUser from '@connect/user/useUser';
import { toggleCommentLike } from '@connect/commentLike/commentLike';
import {
  ModalContextValue,
  ModalProps,
  useModalContext,
} from '@contexts/ModalContext';
import { useRouter } from 'next/navigation';
import useCommentLike from '@connect/commentLike/useCommentLike';
import { ROUTES } from '@constants';

export default function CommentLikeButton({
  commentId,

  showText,
}: {
  commentId: string;

  showText?: boolean;
}) {
  const userId = useUser()?.userId;
  const [hearts, setHearts] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  const { data: likeComments } = useCommentLike();
  const isLike = likeComments?.includes(commentId) || false;

  const router = useRouter();
  const { open: modalOpen, close: modalClose } =
    useModalContext() as ModalContextValue;

  const createHeart = useCallback((e: React.MouseEvent) => {
    const heart = {
      id: Date.now(),
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    };
    setHearts((prevHearts) => [...prevHearts, heart]);
    setTimeout(() => {
      setHearts((prevHearts) => prevHearts.filter((h) => h.id !== heart.id));
    }, 1000);
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    if (userId) {
      toggleCommentLike(commentId, userId);
      createHeart(e);
    } else {
      modalOpen({
        title: '로그인이 필요해요!',
        body: '로그인 페이지로 이동합니다',

        onButtonClick: () => {
          router.push(ROUTES.LOGIN);
          modalClose();
        },
        closeModal: () => {
          modalClose();
        },
      } as ModalProps);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      className={clsx(showText && styles.showText, styles.likeButton)}
    >
      {isLike ? <Icon name="heartFill" color="error" /> : <Icon name="heart" />}
      {hearts.map((heart) => (
        <Icon
          key={heart.id}
          name="heartFill"
          color="error"
          className={styles.floatingHeart}
          style={{
            left: heart.x,
            top: heart.y,
          }}
        />
      ))}
      {showText && <span className={isLike ? styles.liked : ''}>좋아요</span>}
    </button>
  );
}
