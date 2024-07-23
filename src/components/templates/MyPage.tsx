'use client';

import LikeBooks from '@components/LikeBooks';
import BookList from '@components/book/BookList';
import MyImage from '@components/shared/MyImage';
import ProgressBar from '@components/shared/ProgressBar';
import LogoutButton from '@components/sign/LogoutButton';
import useUser from '@hooks/auth/useUser';
import useLikeBooks from '@hooks/useLikeBooks';

export default function MyPage() {
  const user = useUser();
  const { data } = useLikeBooks();
  return (
    <div>
      {user?.displayName}

      <MyImage />

      <ProgressBar value={20} total={50} />
      <LogoutButton>로그아웃</LogoutButton>
      {data && <BookList data={data} />}
    </div>
  );
}
