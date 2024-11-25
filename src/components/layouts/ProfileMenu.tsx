'use client';
import { useEffect, useRef, useState } from 'react';

import styles from './ProfileMenu.module.scss';
import Icon from '@components/icon/Icon';
import useLogin from '@connect/sign/useLogin';
import ProfileImage from '@components/shared/ProfileImage';
import { User } from '@connect/user';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@constants';

export default function ProfileMenu({ user }: { user: User }) {
  const router = useRouter();
  const { logOut } = useLogin();
  const [isOpenMenu, setIsOpenMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <div className={styles.container} ref={menuRef}>
      <button
        onClick={() => {
          setIsOpenMenu((prev) => !prev);
        }}
      >
        <ProfileImage width={40} photoURL={user?.photoURL as string} />
        <span className="a11y-hidden">
          사용자 메뉴
          {isOpenMenu ? '닫기' : '열기'}
        </span>
      </button>
      {isOpenMenu && (
        <div className={styles.menu}>
          <button
            onClick={() => {
              setIsOpenMenu((prev) => !prev);
              router.push(`/${user?.userId}`);
            }}
          >
            <Icon name="alert" color="grayLv3" />
            나의 책장
          </button>
          <button
            onClick={() => {
              setIsOpenMenu((prev) => !prev);
              router.push(ROUTES.MY_BOOK);
            }}
          >
            <Icon name="person" color="grayLv3" />
            나의 책
          </button>
          <button
            onClick={() => {
              setIsOpenMenu((prev) => !prev);
              router.push(ROUTES.FOLLOW);
            }}
          >
            <Icon name="people" color="grayLv3" />
            팔로우
          </button>
          <button
            onClick={() => {
              setIsOpenMenu((prev) => !prev);
              router.push(ROUTES.EDIT_PROFILE);
            }}
          >
            <Icon name="edit" color="grayLv3" />
            프로필 수정
          </button>
          <button
            onClick={() => {
              setIsOpenMenu((prev) => !prev);
              router.push(ROUTES.EDIT_GOAL);
            }}
          >
            <Icon name="flag" color="grayLv3" />
            목표 권수 수정
          </button>
          <button
            onClick={() => {
              setIsOpenMenu((prev) => !prev);
              logOut();
            }}
          >
            <Icon name="logout" color="grayLv3" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
