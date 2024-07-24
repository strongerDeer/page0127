'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@firebase/firebaseApp';
import { useSetRecoilState } from 'recoil';
import { userAtom, userLoadingAtom } from '@atoms/user';
import { useQuery } from 'react-query';
import { getUser } from '@remote/user';

// 인증처리
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [initialize, setInitialize] = useState(false);
  const setUser = useSetRecoilState(userAtom);
  const setIsLoading = useSetRecoilState(userLoadingAtom);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await getUser(user.uid);
        setUser(userData);
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
