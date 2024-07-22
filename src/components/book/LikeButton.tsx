import Icon from '@components/icon/Icon';
import { COLLECTIONS } from '@constants';
import { useModalContext } from '@contexts/ModalContext';
import { store } from '@firebase/firebaseApp';
import useUser from '@hooks/auth/useUser';

import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LikeButton({
  bookId,
  like,
}: {
  bookId: string;
  like: string[];
}) {
  const userId = useUser()?.uid;

  const isClickedLike = userId && like.includes(userId);
  const { open, close } = useModalContext();
  const router = useRouter();

  async function handleLike() {
    if (userId) {
      try {
        if (isClickedLike) {
          // 취소
        } else {
          // 좋아요
        }
      } catch (error) {}
    } else {
      open({
        title: '로그인이 필요해요!',
        body: '로그인 페이지로 이동합니다',
        onButtonClick: () => {
          router.push('/signin');
          close();
        },
        closeModal: () => {
          close();
        },
      });
    }
  }

  return (
    <button type="button" onClick={handleLike}>
      {isClickedLike ? (
        <Icon name="heartFill" color="error" />
      ) : (
        <Icon name="heart" />
      )}
    </button>
  );
}
