'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@firebase/firebaseApp';
import { useSetRecoilState } from 'recoil';
import { userAtom, userLoadingAtom } from '@atoms/user';

// 인증처리
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [initialize, setInitialize] = useState(false);
  const setUser = useSetRecoilState(userAtom);
  const setIsLoading = useSetRecoilState(userLoadingAtom);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? '',
          photoURL: user.photoURL ?? '',
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
      setInitialize(true);

      return () => unsubscribe();
    });
  }, [setUser, setIsLoading]);

  if (initialize === false) {
    return null;
  }

  return <>{children}</>;
}
