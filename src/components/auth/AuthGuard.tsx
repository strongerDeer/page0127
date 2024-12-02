'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@firebase/firebaseApp';
import { useSetRecoilState } from 'recoil';
import { userAtom, userLoadingAtom } from '@atoms/user';
import { getUserDataByUid } from '@connect/sign/useLogin';

// 인증처리
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [initialize, setInitialize] = useState(false);
  const setUser = useSetRecoilState(userAtom);
  const setIsLoading = useSetRecoilState(userLoadingAtom);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const userData = await getUserDataByUid(authUser.uid);
          if (userData) {
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
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
