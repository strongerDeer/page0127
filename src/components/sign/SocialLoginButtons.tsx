import SocialButton from './SocialButton';

import styles from './SocialLoginButtons.module.scss';

export default function SocialLoginButtons({ signUp }: { signUp?: boolean }) {
  return (
    <div className={styles.socialBtnContainer}>
      <SocialButton type="google" color="grayLv4" signUp={signUp} />
      <SocialButton type="github" color="grayLv4" signUp={signUp} />
    </div>
  );
}
