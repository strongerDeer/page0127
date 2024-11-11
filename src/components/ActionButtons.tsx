import CopyButton from './CopyButton';
import KakaoShareButton from './KakaoShareButton';

import styles from './ActionButtons.module.scss';
export default function ActionButtons({
  displayName,
  image,
  introduce,
}: {
  displayName: string;
  image: string;
  introduce: string;
}) {
  return (
    <div className={styles.buttons}>
      <KakaoShareButton
        displayName={displayName}
        image={image}
        introduce={introduce}
      />
      <CopyButton buttonLabel="링크 복사" copy={window.window.location.href} />
    </div>
  );
}
