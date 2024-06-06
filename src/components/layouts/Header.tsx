import Link from 'next/link';
import { usePathname } from 'next/navigation';
// import { useContext } from 'react';

// import { AuthContext } from '@contexts/AuthContext';
// import LogoutButton from '@components/LogoutButton';
// import Button from '@components/shared/Button';

import styles from './Header.module.scss';

import Button from '@components/shared/Button';
import useUser from '@hooks/auth/useUser';
import { useCallback } from 'react';
import LogoutButton from '@components/sign/LogoutButton';
export default function Header() {
  const pathname = usePathname();
  const user = useUser();

  console.log('😀', user);
  const renderButton = useCallback(() => {
    if (user !== null) {
      return (
        <>
          <Button href="/my">마이페이지</Button>
          <LogoutButton text="로그아웃" />
        </>
      );
    } else {
      return (
        <>
          {!pathname.includes('signin') && <Link href="/signin">로그인</Link>}
          {!pathname.includes('signup') && <Link href="/signup">회원가입</Link>}
        </>
      );
    }
  }, [user, pathname]);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.header__h1}>
        <h1>page0127</h1>
      </Link>
      <div className={styles.header__right}>{renderButton()}</div>
    </header>
  );
}
