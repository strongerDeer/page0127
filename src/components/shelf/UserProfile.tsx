import ProfileImage from '@components/shared/ProfileImage';
import styles from './UserProfile.module.scss';
import { User } from '@connect/user';
import useFollowing from '@connect/follow/useFollowing';
import useUser from '@connect/user/useUser';
import FollowButton from '@components/follow/FollowButton';

export default function UserProfile({
  userId,
  uid,
  userData,
}: {
  userId: string;
  uid: string;
  userData: User;
}) {
  const user = useUser();
  const { data: following } = useFollowing();

  return (
    <div className={styles.profileContainer}>
      <div className={styles.info}>
        <ProfileImage photoURL={userData?.photoURL as string} width={100} />

        <p className={styles.displayName}>{userData?.displayName}</p>
        {userData?.introduce && (
          <p className={styles.intro}>{userData?.introduce}</p>
        )}

        {user?.uid !== uid && (
          <FollowButton
            isFollowing={following?.includes(uid) || false}
            uid={uid}
            userId={userId}
          />
        )}
      </div>

      <div className={styles.follow}>
        <p>
          <span>follower</span>
          <strong>{userData?.followersCount}</strong>
        </p>
        <span></span>
        <p>
          <span>following</span>
          <strong>{userData?.followingCount}</strong>
        </p>
      </div>
    </div>
  );
}
