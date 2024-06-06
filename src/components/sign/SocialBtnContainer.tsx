import SocialButton from './SocialButton';

import styles from './SocialBtnContainer.module.scss';

export default function SocialBtnContainer() {
  return (
    <div className={styles.socialBtnContainer}>
      <SocialButton type="google" color="grayLv4" />
      <SocialButton type="github" color="grayLv4" />
    </div>
  );
}
