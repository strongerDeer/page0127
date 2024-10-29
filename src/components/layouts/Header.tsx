import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.scss';

import Button from '@components/shared/Button';
import { useCallback } from 'react';
import Icon from '@components/icon/Icon';

import { cormorant } from '@font';
import useUser, { useUserLoading } from '@connect/user/useUser';
import ProfileMenu from './ProfileMenu';

export default function Header() {
  const pathname = usePathname();
  const user = useUser();
  const isLoading = useUserLoading();

  const renderButton = useCallback(() => {
    if (user !== null) {
      return (
        <>
          {user?.uid === process.env.NEXT_PUBLIC_ADMIN_ID && (
            <Button href={`/admin`}>관리자</Button>
          )}

          <Link href="/book/create" className={styles.iconBtn}>
            <Icon name="addBook" color="#29D063" />
            <span className="a11y-hidden">읽은 책 등록</span>
          </Link>

          <button className={styles.iconBtn}>
            <Icon name="bell" color="grayLv4" />
            <span className="a11y-hidden">알림</span>
            <span
              style={{
                position: 'absolute',
                top: '0',
                right: '0',
                border: '2px solid #fff',
                display: 'inline-block',
                padding: '0 0.5em',
                borderRadius: '4rem',
                backgroundColor: '#29D063',
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: 'bold',
              }}
            >
              1
            </span>
          </button>

          <ProfileMenu user={user} />
        </>
      );
    } else {
      return (
        <>
          {!pathname.includes('login') && (
            <Link href="/login" className={styles.loginBtn}>
              <Icon name="login" />
              <span>로그인</span>
            </Link>
          )}
          {!pathname.includes('join') && (
            <Link href="/join" className={styles.joinBtn}>
              <Icon name="join" />
              <span>회원가입</span>
            </Link>
          )}
        </>
      );
    }
  }, [user, pathname]);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.header__h1}>
        <h1 className={cormorant.className}>
          page 0127<span>.</span>
        </h1>
      </Link>

      {!isLoading && (
        <div className={styles.header__right}>{renderButton()}</div>
      )}
    </header>
  );
}
