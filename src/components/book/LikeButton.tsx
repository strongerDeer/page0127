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

export default function LikeButton({
  bookId,
  likeUsers = [],
}: {
  bookId: string;
  likeUsers?: string[];
}) {
  const userId = useUser()?.uid;
  const isLiked = likeUsers?.includes(userId as string);

  const handleLike = async () => {
    if (!isLiked) {
      await updateDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId), {
        likeUsers: arrayUnion(userId),
      });
    } else {
      await updateDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId), {
        likeUsers: arrayRemove(userId),
      });
    }
  };
  return (
    <button type="button" onClick={handleLike}>
      {isLiked ? (
        <Icon name="heartFill" color="error" />
      ) : (
        <Icon name="heart" />
      )}
    </button>
  );
}
