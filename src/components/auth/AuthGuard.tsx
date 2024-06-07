'use client';
import { userAtom, userLoadingAtom } from '@atoms/user';
import { auth } from '@firebase/firebaeApp';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useSetRecoilState } from 'recoil';

// 인증처리
export default function AuthGuard() {
  const setUser = useSetRecoilState(userAtom);
  const setIsLoading = useSetRecoilState(userLoadingAtom);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);

      return () => unsubscribe();
    });
  }, [auth]);

  return null;
}
