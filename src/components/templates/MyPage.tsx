'use client';

import LikeBooks from '@components/LikeBooks';
import MyImage from '@components/shared/MyImage';
import ProgressBar from '@components/shared/ProgressBar';
import LogoutButton from '@components/sign/LogoutButton';
import useUser from '@hooks/auth/useUser';
import useBookLike from '@hooks/useBookLike';

export default function MyPage() {
  const user = useUser();
  const { data } = useBookLike();
  const bookIds = data?.map(({ bookId }: { bookId: string }) => bookId);
  return (
    <div>
      {user?.displayName}

      <MyImage />

      <ProgressBar value={20} total={50} />
      <LogoutButton>로그아웃</LogoutButton>
      {bookIds && <LikeBooks bookIds={bookIds} />}
    </div>
  );
}
