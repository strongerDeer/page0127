'use client';
import { useRouter } from 'next/navigation';
import { userAtom } from '@atoms/user';
import { COLLECTIONS } from '@constants';
import { auth, storage, store } from '@firebase/firebaseApp';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  UserCredential,
} from 'firebase/auth';
import { deleteDoc, doc, runTransaction } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useSetRecoilState } from 'recoil';
import { User } from '@connect/user';
import { SignInFormValues, SignUpFormValues } from '.';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useCallback } from 'react';
import { useModalContext } from '@contexts/ModalContext';
import useUser from '@connect/user/useUser';

type SocialLoginType = 'google' | 'github';

export default function useLogin() {
  const user = useUser();
  const router = useRouter();
  const setUser = useSetRecoilState(userAtom);
  const { open, close } = useModalContext();
  const authUser = auth.currentUser;

  // email 회원가입
  const signUp = async (formValues: SignUpFormValues, profileImage: string) => {
    const { email, password, displayName } = formValues;

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(user, { displayName });
      let photoURL =
        (await uploadProfileImage(user.uid, profileImage)) || user.photoURL;
      const userData = await handleUserData({ ...user, photoURL });
      router.push('/');
      setUser(userData);
      toast.success('가입되었습니다.');
    } catch (error) {}
  };

  // email 로그인
  const emailLogin = async (formValues: SignInFormValues) => {
    const { email, password } = formValues;
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userData = await handleUserData(user);
      router.push('/');
      setUser(userData);
      toast.success('로그인 되었습니다.');
    } catch (error) {
      emailLoginError(error);
    }
  };

  // SNS 회원가입/로그인
  const socialLogin = async (type: SocialLoginType) => {
    const provider =
      type === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();

    try {
      const { user } = await signInWithPopup(auth, provider);
      const userData = await handleUserData(user);
      router.push('/');
      setUser(userData);
      toast.success('로그인 되었습니다.');
    } catch (error) {
      socialLoginError(error);
    }
  };

  // 프로필 이미지 업데이트
  const uploadProfileImage = async (uid: string, profileImage: string) => {
    if (profileImage === '') return null;

    const imgKey = `${uid}/${uuidv4()}`;
    const storageRef = ref(storage, imgKey);
    const data = await uploadString(storageRef, profileImage, 'data_url');
    return await getDownloadURL(data?.ref);
  };

  const handleUserData = async (
    user: UserCredential['user'],
  ): Promise<User> => {
    const baseId = user.email?.split('@')[0] || user.uid;
    let userData: User = {
      uid: user.uid,
      showId: '',
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL,
      provider: user.providerData[0].providerId,
    };

    await runTransaction(store, async (transaction) => {
      const userDoc = doc(store, COLLECTIONS.USER, user.uid);
      const userSnap = await transaction.get(userDoc);

      if (userSnap.exists()) {
        const existingUser = userSnap.data() as User;
        userData.showId = existingUser.showId;
      } else {
        const { showId, counter } = await generateUniqueShowId(
          transaction,
          baseId,
        );
        userData.showId = showId;

        transaction.set(
          doc(store, COLLECTIONS.COUNTERS, 'userIdCounter'),
          { [baseId]: counter },
          { merge: true },
        );
        transaction.set(userDoc, userData, { merge: true });
      }
    });

    return userData;
  };

  const generateUniqueShowId = async (transaction: any, baseId: string) => {
    const counterDoc = doc(store, COLLECTIONS.COUNTERS, 'userIdCounter');
    const counterSnap = await transaction.get(counterDoc);

    let counter = 1;
    if (counterSnap.exists()) {
      const data = counterSnap.data();
      counter = (data[baseId] || 0) + 1;
    }

    const showId = counter === 1 ? baseId : `${baseId}${counter - 1}`;
    return { showId, counter };
  };

  const emailLoginError = (error: unknown) => {
    if (error instanceof FirebaseError) {
      if (['auth/invalid-credential'].includes(error.code)) {
        toast.error('이메일과 비밀번호를 다시 확인해 주세요');
      } else {
        console.log(error.message);
        toast.error('회원가입 중 오류가 발생했습니다.');
      }
    }
  };

  const socialLoginError = (error: unknown) => {
    console.error(error);
    if (error instanceof FirebaseError) {
      if (
        ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(
          error.code,
        )
      ) {
        return;
      }
      toast.error(error.message);
    }
  };

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

            await deleteDoc(doc(store, COLLECTIONS.USER, uid));
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
            await reauthenticateUser(provider);

            await deleteDoc(doc(store, COLLECTIONS.USER, uid));
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

  return {
    signUp,
    emailLogin,
    socialLogin,
    logOut,
    deleteAccount,
    deleteProviderAccount,
  };
}
