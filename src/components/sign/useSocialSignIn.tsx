'use client';
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { useCallback } from 'react';
import { auth, store } from '@firebase/firebaseApp';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { COLLECTIONS } from '@constants';
import { FirebaseError } from 'firebase/app';
import { useModalContext } from '@contexts/ModalContext';

export default function useSocialSignIn() {
  const router = useRouter();
  const { open, close } = useModalContext();

  const logIn = useCallback(
    async (type: string) => {
      let provider;

      switch (type) {
        case 'google':
          provider = new GoogleAuthProvider();
          break;
        case 'github':
          provider = new GithubAuthProvider();
      }

      try {
        const { user } = await signInWithPopup(
          auth,
          provider as GoogleAuthProvider | GithubAuthProvider,
        );

        const useSnapshot = await getDoc(
          doc(collection(store, COLLECTIONS.USER), user.uid),
        );

        if (!useSnapshot.exists()) {
          // 유저정보가 존재하지 않을 때만 추가
          const createUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            provider: user.providerData[0].providerId,
          };

          await setDoc(
            doc(collection(store, COLLECTIONS.USER), user.uid),
            createUser,
          );
        }
        router.back();
        toast.success('로그인 되었습니다.');
      } catch (error) {
        console.log(error);
        if (error instanceof FirebaseError) {
          if (
            error.code === 'auth/popup-closed-by-user' ||
            error.code === 'auth/cancelled-popup-request'
          ) {
            return;
          } else {
            const errorMsg = error?.message;
            toast.error(errorMsg);
          }
        }
      }
    },
    [router],
  );

  const logOut = useCallback(() => {
    open({
      title: '로그아웃 하시겠습니까?',
      buttonLabel: '로그아웃',
      onButtonClick: async () => {
        try {
          await signOut(auth);
          close();
          toast.success('로그아웃 되었습니다!');
        } catch (error) {
          console.log(error);
        }
      },
      closeButtonLabel: '취소',
      closeModal: () => {
        close();
      },
    });
  }, []);
  return { logIn, logOut };
}
