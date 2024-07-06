'use client';
import ShareBtn from '@components/my/ShareBtn';
import MyImage from '@components/shared/MyImage';
import ProgressBar from '@components/shared/ProgressBar';
import LogoutButton from '@components/sign/LogoutButton';
import useUser from '@hooks/auth/useUser';

export default function MyPage() {
  const user = useUser();
  return (
    <div>
      {user?.displayName}

      <MyImage />
      <ProgressBar read={20} goal={50} />
      <LogoutButton text="로그아웃" />
    </div>
  );
}
