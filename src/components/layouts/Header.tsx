import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.scss';

import Button from '@components/shared/Button';
import { useCallback, useState } from 'react';
import Icon from '@components/icon/Icon';

import { cormorant } from '@font';
import ProfileImage from '@components/shared/ProfileImage';
import useUser, { useUserLoading } from '@connect/user/useUser';
import useLogin from '@connect/sign/useLogin';

export default function Header() {
  const pathname = usePathname();
  const user = useUser();
  const isLoading = useUserLoading();
  const { logOut } = useLogin();

  const [isOpenMenu, setIsOpenMenu] = useState<boolean>(false);

  const ProfileButton = () => {
    return (
      <>
        <button
          onClick={() => {
            setIsOpenMenu((prev) => !prev);
            console.log('ddd');
          }}
        >
          <ProfileImage width={40} photoURL={user?.photoURL as string} />
        </button>
        {isOpenMenu && (
          <div>
            <Link href={`/shelf/${user?.userId}`}>
              <Icon name="alert" color="grayLv3" />
              나의 책장
            </Link>
            <Link href="/my">
              <Icon name="person" color="grayLv3" />
              마이페이지
            </Link>
            <Link href="/my/edit-profile">
              <Icon name="edit" color="grayLv3" />
              프로필 수정
            </Link>

            <Link href="/my/goal">
              <Icon name="flag" color="grayLv3" />
              목표 권수 수정
            </Link>

            <button onClick={logOut}>
              <Icon name="logout" color="grayLv3" />
              로그아웃
            </button>
          </div>
        )}
      </>
    );
  };

  const renderButton = useCallback(() => {
    if (user !== null) {
      return (
        <>
          {user?.uid === process.env.NEXT_PUBLIC_ADMIN_ID && (
            <Button href={`/admin`}>관리자</Button>
          )}

          <Link href="/book/create">
            <Icon name="addBook" color="#29D063" />
            <span className="a11y-hidden">읽은 책 등록</span>
          </Link>

          <button
            style={{
              width: '4rem',
              height: '4rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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

          <ProfileButton />
        </>
      );
    } else {
      return (
        <>
          {!pathname.includes('login') && <Link href="/login">로그인</Link>}
          {!pathname.includes('join') && <Link href="/join">회원가입</Link>}
        </>
      );
    }
  }, [logOut, user, pathname, isOpenMenu]);

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
