import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.scss';

import Button from '@components/shared/Button';
import { useCallback } from 'react';
import Icon from '@components/icon/Icon';

import { cormorant } from '@font';
import ProfileImage from '@components/shared/ProfileImage';
import useSocialSignIn from '@components/sign/useSocialSignIn';
import useUser, { useUserLoading } from '@connect/user/useUser';
export default function Header() {
  const pathname = usePathname();
  const user = useUser();
  const isLoading = useUserLoading();
  const { logOut } = useSocialSignIn();

  const renderButton = useCallback(() => {
    if (user !== null) {
      return (
        <>
          {user?.uid === process.env.NEXT_PUBLIC_ADMIN_ID && (
            <Button href={`/admin`}>관리자</Button>
          )}
          <Button href={`/book/create`}>읽은 책 등록</Button>
          <Link href="/my">
            <ProfileImage width={40} photoURL={user?.photoURL as string} />
          </Link>
          <Button
            href={`/shelf/${user?.uid}`}
            variant="outline"
            color="grayLv4"
          >
            나의 책장
          </Button>
          <button type="button" onClick={logOut}>
            <Icon name="logout" color="grayLv3" />
            <span className="a11y-hidden">로그아웃</span>
          </button>
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
  }, [logOut, user, pathname]);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.header__h1}>
        <h1 className={cormorant.className}>page 0127.</h1>
      </Link>
      {!isLoading && (
        <div className={styles.header__right}>{renderButton()}</div>
      )}
    </header>
  );
}
