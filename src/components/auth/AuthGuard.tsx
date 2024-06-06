'use client';
import { userAtom } from '@atoms/user';
import { auth } from '@firebase/firebaeApp';
import { onAuthStateChanged } from 'firebase/auth';
import { useState } from 'react';
import { useSetRecoilState } from 'recoil';

// 인증처리
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [initialize, setInitialize] = useState<boolean>(false);

  const setUser = useSetRecoilState(userAtom);

  onAuthStateChanged(auth, (user) => {
    // console.log('user', user);

    if (user !== null) {
      setUser({
        uid: user.uid,
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
      });
    } else {
      setUser(null);
    }
    setInitialize(true);
  });

  if (initialize === false) {
    // 로딩 추가
    return <div>인증 처리 로딩중....</div>;
  }
  return <>{children}</>;
}
