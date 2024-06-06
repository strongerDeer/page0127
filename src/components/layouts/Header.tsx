import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext } from 'react';

import { AuthContext } from '@contexts/AuthContext';

import LogoutButton from '@components/LogoutButton';
import Button from '@components/shared/Button';

import styles from './Header.module.scss';
export default function Header() {
  const pathname = usePathname();
  // const showSignButton = pathname.includes('signup' || 'signin') === false;
  // const { user } = useContext(AuthContext);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.header__h1}>
        <h1>page0127</h1>
      </Link>

      <div className={styles.header__right}>
        {!pathname.includes('signin') && <Link href="/signin">로그인</Link>}
        {!pathname.includes('signup') && <Link href="/signup">회원가입</Link>}
      </div>

      {/*
          <Button href="/my">마이페이지</Button>
          <LogoutButton /> 
      */}
    </header>
  );
}
