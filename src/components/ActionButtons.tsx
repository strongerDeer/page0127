import { User } from '@models/user';

import CopyButton from './CopyButton';
import KakaoShareButton from './KakaoShareButton';

import styles from './ActionButtons.module.scss';
import useUser from '@connect/user/useUser';
export default function ActionButtons({ userData }: { userData: User }) {
  const user = useUser();
  return (
    <div className={styles.buttons}>
      {user?.uid !== userData.uid && (
        <button type="button" onClick={() => {}}>
          팔로우하기
        </button>
      )}

      <KakaoShareButton userData={userData} />

      <CopyButton buttonLabel="링크 복사" copy={window.window.location.href} />
    </div>
  );
}
