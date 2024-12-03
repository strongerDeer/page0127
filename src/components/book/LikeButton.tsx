'use client';
import Icon from '@components/icon/Icon';

import { useCallback, useState } from 'react';
import styles from './LikeButton.module.scss';
import clsx from 'clsx';
import useUser from '@connect/user/useUser';
import { toggleLike } from '@connect/like/likeBook';
import { ModalProps, useModalContext } from '@contexts/ModalContext';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@constants';

export default function LikeButton({
  bookId,
  isLike,
  showText,
}: {
  bookId: string;
  isLike: boolean;
  showText?: boolean;
}) {
  const userId = useUser()?.userId;
  const [hearts, setHearts] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  const router = useRouter();
  const { open: modalOpen, close: modalClose } = useModalContext();

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
      toggleLike(bookId, userId);
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
      aria-label="좋아요"
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

      <span
        className={clsx(
          isLike ? styles.liked : '',
          showText ? '' : 'a11y-hidden',
        )}
      >
        좋아요
      </span>
    </button>
  );
}
