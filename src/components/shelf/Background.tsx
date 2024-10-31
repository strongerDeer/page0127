import Image from 'next/image';
import styles from './Background.module.scss';
import ActionButtons from '@components/ActionButtons';
import { User } from '@connect/user';

export default function Background({
  userId,
  userData,
}: {
  userId: string;
  userData: User;
}) {
  return (
    <div className={styles.background}>
      <Image
        src={userData.backgroundURL || '/images/main-visual.jpg'}
        alt=""
        width={1920}
        height={400}
        priority
      />

      <p>{userData.displayName}님의 책장</p>
      <ActionButtons
        userId={userId}
        uid={userData.uid}
        displayName={userData.displayName || ''}
        photoURL={userData.displayName || ''}
      />
      <p>{userData.totalBook}</p>
    </div>
  );
}
