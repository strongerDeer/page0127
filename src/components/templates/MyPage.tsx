'use client';

import BookList from '@components/book/BookList';
import ProfileImage from '@components/shared/ProfileImage';
import ProgressBar from '@components/shared/ProgressBar';
import useUser from '@hooks/auth/useUser';
import useLikeBooks from '@hooks/useLikeBooks';

import styles from './MyPage.module.scss';
import Button from '@components/shared/Button';
import useSocialSignIn from '@components/sign/useSocialSignIn';
export default function MyPage() {
  const user = useUser();
  const { data } = useLikeBooks();
  const { logOut } = useSocialSignIn();
  return (
    <div className={styles.myPage}>
      <ProfileImage photoURL={user?.photoURL as string} />
      <strong>{user?.displayName}</strong>
      {user?.intro && <p>{user?.intro}</p>}
      <ProgressBar
        value={Number(user?.total?.length)}
        total={Number(user?.goal) || 1}
      />

      <div className={styles.btns}>
        <Button onClick={logOut}>로그아웃</Button>
        <Button href="/my/edit-profile" variant="outline">
          프로필 수정
        </Button>
      </div>

      <p>좋아요한 책</p>
      {data && <BookList data={data} />}
    </div>
  );
}
