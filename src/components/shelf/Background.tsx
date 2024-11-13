import Image from 'next/image';
import styles from './Background.module.scss';
import ActionButtons from '@components/ActionButtons';
import { User } from '@connect/user';
import clsx from 'clsx';
import { pretendard } from '@font';
import { DEFAULT_BG } from '@constants';

const currentYear = new Date().getFullYear();

export default function Background({
  userId,
  userData,

  setYear,
}: {
  userId: string;
  userData: User;

  setYear: React.Dispatch<React.SetStateAction<string>>;
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
        <div className={styles.left}>
          <div>
            <select
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setYear(e.target.value);
              }}
              className={clsx(styles.yearSelect, pretendard.className)}
            >
              <option value={currentYear}>{currentYear}년</option>
              <option value={currentYear - 1}>{currentYear - 1}년</option>
              <option value={currentYear - 2}>{currentYear - 2}년</option>
              <option value={currentYear - 3}>{currentYear - 3}년</option>
              <option value={currentYear - 4}>{currentYear - 4}년</option>
            </select>
            <h2 className={styles.title}>
              <strong>{userData.displayName}</strong>님의 책장
            </h2>
          </div>
          <ActionButtons
            displayName={userData.displayName || ''}
            introduce={userData.introduce || ''}
            image={userData.backgroundURL || DEFAULT_BG}
          />
        </div>
        <div className={styles.count}>
          <h3>지금까지 읽은 책</h3>
          <p>
            <strong>{userData.totalBook.toLocaleString()}</strong>권
          </p>
          <p>
            <strong>{userData.totalPage.toLocaleString()}</strong>쪽
          </p>
        </div>
      </div>
    </div>
  );
}
