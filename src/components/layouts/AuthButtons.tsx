import Icon from '@components/icon/Icon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './AuthButtons.module.scss';
import { ROUTES } from '@constants';

export default function AuthButtons() {
  const pathname = usePathname();

  return (
    <>
      {!pathname.includes('login') && (
        <Link href={ROUTES.LOGIN} className={styles.loginBtn}>
          <Icon name="login" />
          <span>로그인</span>
        </Link>
      )}
      {!pathname.includes('join') && (
        <Link href={ROUTES.JOIN} className={styles.joinBtn}>
          <Icon name="join" />
          <span>회원가입</span>
        </Link>
      )}
    </>
  );
}
