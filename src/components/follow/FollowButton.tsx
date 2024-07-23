import Button from '@components/shared/Button';
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

export default function FollowButton({ pageUid }: { pageUid: string }) {
  const userId = useUser()?.uid;

  if (pageUid === userId) {
    return null;
  }
  const isFollowed = false;
  const handleFollow = async () => {
    console.log(pageUid);

    if (!isFollowed) {
      await updateDoc(doc(collection(store, COLLECTIONS.USER), pageUid), {
        follower: arrayUnion(userId),
      });
    } else {
      await updateDoc(doc(collection(store, COLLECTIONS.USER), pageUid), {
        follower: arrayRemove(userId),
      });
    }
  };
  return <Button onClick={handleFollow}>팔로우</Button>;
}
