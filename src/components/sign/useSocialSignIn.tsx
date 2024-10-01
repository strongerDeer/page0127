'use client';
import {
  EmailAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { useCallback } from 'react';
import { auth, store } from '@firebase/firebaseApp';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { COLLECTIONS } from '@constants';
import { FirebaseError } from 'firebase/app';
import { useModalContext } from '@contexts/ModalContext';
import useUser from '@connect/user/useUser';
import { useSetRecoilState } from 'recoil';
import { userAtom } from '@atoms/user';
import { User } from '@connect/user';

export default function useSocialSignIn() {
  const setUser = useSetRecoilState(userAtom);
  const user = useUser();
  const router = useRouter();
  const { open, close } = useModalContext();
  const authUser = auth.currentUser;

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
          { merge: true },
        );

        setUser(createUser as User);
        // router.push('/');
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
    [setUser],
  );

  const logOut = useCallback(() => {
    open({
      title: '로그아웃 하시겠습니까?',
      buttonLabel: '로그아웃',
      onButtonClick: async () => {
        try {
          close();
          router.push('/');
          setTimeout(() => {
            signOut(auth);
            setUser(null);
          }, 300);
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
  }, [open, close, router, setUser]);

  const deleteAccount = useCallback(
    ({
      password,
      uid,
      email,
    }: {
      password: string;
      uid: string;
      email: string;
    }) => {
      if (!authUser || !user) return;
      open({
        title: '정말 회원 탈퇴 하시겠습니까?',
        body: '모든 데이터가 삭제되며 복구되지 않습니다',
        buttonLabel: '회원 탈퇴',
        onButtonClick: async () => {
          try {
            close();
            router.push('/');

            const credential = EmailAuthProvider.credential(email, password);
            await reauthenticateWithCredential(authUser, credential);

            // firestore에서 사용자 데이터 삭제
            await deleteDoc(doc(store, COLLECTIONS.USER, uid));

            // 사용자 계정 삭제
            await deleteUser(authUser);

            setUser(null);

            toast.success('탈퇴 되었습니다!');
          } catch (error) {
            if (error instanceof FirebaseError) {
              if (error.code === 'auth/invalid-credential') {
                toast.error('비밀번호가 일치하지 않습니다.');
              }
            }
          }
        },
        closeButtonLabel: '취소',
        closeModal: () => {
          close();
        },
      });
    },
    [open, close, router, setUser, user, authUser],
  );

  const reauthenticateUser = useCallback(
    async (provider: string) => {
      if (!authUser) return;
      switch (provider) {
        case 'google.com':
          await reauthenticateWithPopup(authUser, new GoogleAuthProvider());
          break;
        case 'github.com':
          await reauthenticateWithPopup(authUser, new GithubAuthProvider());
          break;
        default:
          throw new Error('지원되지 않는 인증 제공자입니다.');
      }
    },
    [authUser],
  );

  const deleteProviderAccount = useCallback(
    ({ uid, provider }: { provider: string; uid: string }) => {
      if (!authUser) return;
      open({
        title: '정말 회원 탈퇴 하시겠습니까?',
        body: '모든 데이터가 삭제되며 복구되지 않습니다',
        buttonLabel: '회원 탈퇴',
        onButtonClick: async () => {
          try {
            close();
            router.push('/');
            // 사용자 재인증
            await reauthenticateUser(provider);

            // firestore에서 사용자 데이터 삭제
            await deleteDoc(doc(store, COLLECTIONS.USER, uid));

            // 사용자 계정 삭제
            await deleteUser(authUser);

            toast.success('탈퇴 되었습니다!');
          } catch (error) {
            console.log(error);
          }
        },
        closeButtonLabel: '취소',
        closeModal: () => {
          close();
        },
      });
    },
    [open, close, router, authUser, reauthenticateUser],
  );
  return { logIn, logOut, deleteAccount, deleteProviderAccount };
}
