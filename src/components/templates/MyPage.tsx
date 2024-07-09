'use client';

import MyImage from '@components/shared/MyImage';
import ProgressBar from '@components/shared/ProgressBar';
import LogoutButton from '@components/sign/LogoutButton';
import useUser from '@hooks/auth/useUser';
import { useState } from 'react';

export default function MyPage() {
  const user = useUser();
  return (
    <div>
      {user?.displayName}

      <MyImage />

      <ProgressBar value={20} total={50} />
      <LogoutButton text="로그아웃" />
    </div>
  );
}
