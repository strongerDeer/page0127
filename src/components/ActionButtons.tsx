import CopyButton from './CopyButton';
import KakaoShareButton from './KakaoShareButton';

import styles from './ActionButtons.module.scss';
export default function ActionButtons({
  displayName,
  photoURL,
}: {
  userId: string;
  uid: string;
  displayName: string;
  photoURL: string;
}) {
  return (
    <div className={styles.buttons}>
      <KakaoShareButton displayName={displayName} photoURL={photoURL} />
      <CopyButton buttonLabel="링크 복사" copy={window.window.location.href} />
    </div>
  );
}
