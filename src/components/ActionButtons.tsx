import CopyButton from './CopyButton';
import KakaoShareButton from './KakaoShareButton';

import styles from './ActionButtons.module.scss';
import useUser from '@connect/user/useUser';
import FollowButton from './follow/FollowButton';
import useFollowing from '@connect/follow/useFollowing';

export default function ActionButtons({
  userId,
  uid,
  displayName,
  photoURL,
}: {
  userId: string;
  uid: string;
  displayName: string;
  photoURL: string;
}) {
  const user = useUser();
  const { data: following } = useFollowing();

  return (
    <div className={styles.buttons}>
      {user?.uid !== uid && (
        <FollowButton
          isFollowing={following?.includes(uid) || false}
          uid={uid}
          userId={userId}
        />
      )}

      <KakaoShareButton displayName={displayName} photoURL={photoURL} />

      <CopyButton buttonLabel="링크 복사" copy={window.window.location.href} />
    </div>
  );
}
