import Icon from '@components/icon/Icon';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';

import useUser from '@hooks/auth/useUser';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useState } from 'react';
import styles from './LikeButton.module.scss';
import clsx from 'clsx';
import { toggleLike } from '@remote/likeBook';

export default function LikeButton({
  bookId,
  showText,
  likeUsers = [],
}: {
  bookId: string;
  showText?: boolean;
  likeUsers?: string[];
}) {
  const userId = useUser()?.uid;
  const isLiked = likeUsers?.includes(userId as string);
  const [hearts, setHearts] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

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
      // await updateDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId), {
      //   likeUsers: arrayUnion(userId),
      // });
    }
  };
  return (
    <button
      type="button"
      onClick={handleLike}
      className={clsx(showText && styles.showText, styles.likeButton)}
    >
      {isLiked ? (
        <Icon name="heartFill" color="error" />
      ) : (
        <Icon name="heart" />
      )}
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
      {showText && <span className={isLiked ? styles.liked : ''}>좋아요</span>}
    </button>
  );
}
