import Icon from '@components/icon/Icon';
import { COLLECTIONS } from '@constants';
import { useAlertContext } from '@contexts/AlertContext';
import { useModalContext } from '@contexts/ModalContext';
import { store } from '@firebase/firebaseApp';
import useUser from '@hooks/auth/useUser';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
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

  async function addLike() {
    if (userId) {
      try {
        await updateDoc(doc(store, COLLECTIONS.BOOKS, bookId), {
          like: arrayUnion(userId),
        });
      } catch (error) {}
    } else {
      open({
        title: '로그인이 필요해요!',
        body: '로그인 페이지로 이동합니다',
        onButtonClick: () => {
          router.push('/signin');
        },
        closeModal: () => {
          close();
        },
      });
    }
  }

  return (
    <button type="button" onClick={addLike}>
      {isClickedLike ? (
        <Icon name="heartFill" color="error" />
      ) : (
        <Icon name="heart" />
      )}
    </button>
  );
}
