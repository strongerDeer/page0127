import Link from 'next/link';
import { usePathname } from 'next/navigation';
// import { useContext } from 'react';

// import { AuthContext } from '@contexts/AuthContext';
// import LogoutButton from '@components/LogoutButton';
// import Button from '@components/shared/Button';

import styles from './Header.module.scss';

import Button from '@components/shared/Button';
import useUser, { useUserLoading } from '@hooks/auth/useUser';
import { useCallback } from 'react';
import LogoutButton from '@components/sign/LogoutButton';
import Icon from '@components/icon/Icon';
export default function Header() {
  const pathname = usePathname();
  const user = useUser();
  const isLoading = useUserLoading();

  const renderButton = useCallback(() => {
    if (user !== null) {
      return (
        <>
          <Button href={`/book/create`}>읽은 책 등록</Button>
          <Button href={`/shelf/${user.uid}`} variant="outline" color="grayLv4">
            나의 책장
          </Button>
          <LogoutButton variant="outline" color="grayLv4">
            <Icon name="arrowRight" color="grayLv3" />
            <span className="a11y-hidden">로그아웃</span>
          </LogoutButton>
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
      {!isLoading && (
        <div className={styles.header__right}>{renderButton()}</div>
      )}
    </header>
  );
}
