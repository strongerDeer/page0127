import Image from 'next/image';
import styles from './Background.module.scss';
import ActionButtons from '@components/ActionButtons';
import { User } from '@connect/user';
import Select from '@components/form/Select';

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

      <div className={styles.text}>
        <div>
          <Select
            options={[{ value: 2024, label: '2024' }]}
            label="년도"
            value="2024"
            hiddenLabel
            onChange={() => {}}
          />
          <h2 className={styles.title}>
            <strong>{userData.displayName}</strong>님의 책장
          </h2>
          <ActionButtons
            userId={userId}
            uid={userData.uid}
            displayName={userData.displayName || ''}
            photoURL={userData.displayName || ''}
          />
        </div>
        <div className={styles.count}>
          <p>
            <strong>{userData.totalBook}</strong>권
          </p>
          <p>
            <strong>{userData.totalPage}</strong>쪽
          </p>
        </div>
      </div>
    </div>
  );
}
