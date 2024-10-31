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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useSetRecoilState } from 'recoil';
import { SocialLoginType, User } from '@connect/user';
import { SignInFormValues, SignUpFormValues } from '.';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useCallback } from 'react';
import { useModalContext } from '@contexts/ModalContext';
import useUser from '@connect/user/useUser';

export default function useLogin() {
  const user = useUser();
  const router = useRouter();
  const setUser = useSetRecoilState(userAtom);
  const { open, close } = useModalContext();
  const authUser = auth.currentUser;

  const createUser = async (user: UserCredential['user']) => {
    const { uid, displayName, email, photoURL } = user;

    let baseId = email?.split('@')[0] || uid;
    const userId = await getUserId(baseId);

    try {
      const userData: User = {
        uid,
        userId,
        displayName: displayName,
        photoURL: photoURL,
        backgroundURL: '',
        introduce: '',
        currentGoal: 0,
        totalBook: 0,
        totalPage: 0,
        followersCount: 0,
        followingCount: 0,
        email: email as string,
        createdAt: user.metadata.creationTime as string,
        provider: user.providerData[0].providerId as SocialLoginType,
      };

      await setDoc(doc(store, `${COLLECTIONS.USER}/${uid}`), userData, {
        merge: true,
      });
      setUser(userData);
    } catch (error) {
      console.error('Error creating user documents:', error);
    }
  };

  // SNS 회원가입/로그인
  const socialLogin = async (type: SocialLoginType) => {
    const providerType =
      type === 'google.com'
        ? new GoogleAuthProvider()
        : new GithubAuthProvider();

    try {
      const { user } = await signInWithPopup(auth, providerType);
      const { uid, email } = user;

      const counterDoc = await getDoc(doc(store, `${COLLECTIONS.USER}/${uid}`));

      // 1. 저장된 유저
      if (counterDoc.exists()) {
        toast.success('로그인 되었습니다.');
      } else {
        const isEmailAvailable = await checkEmailAvailable(
          email as string,
          uid,
        );
        // 2. 이미 가입된 이메일
        if (isEmailAvailable === 'unavailable') {
          return toast.error(
            '이미 사용중인 이메일이에요. 아이디/비밀번호를 입력해 로그인해주세요!',
          );
        }
        // 3. 새로운 유저
        createUser(user);
        router.push('/');
        toast.success('가입되었습니다!');
      }
    } catch (error) {
      socialLoginError(error);
    }
  };

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
      const userData = { ...user, displayName, photoURL };
      createUser(userData);
      toast.success('가입되었습니다!');
    } catch (error) {
      console.error('Sign up error:', error);
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            toast.error('이미 사용 중인 이메일입니다.');
            break;
          case 'auth/invalid-email':
            toast.error('유효하지 않은 이메일 형식입니다.');
            break;
          case 'auth/weak-password':
            toast.error('비밀번호가 너무 약합니다.');
            break;
          default:
            toast.error('회원가입 중 오류가 발생했습니다.');
        }
      } else {
        toast.error('회원가입 중 오류가 발생했습니다.');
      }
    }
  };

  // email 로그인
  const emailLogin = async (formValues: SignInFormValues) => {
    const { email, password } = formValues;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('로그인되었습니다!');
    } catch (error) {
      emailLoginError(error);
    }
  };

  const getUserId = async (baseId: string) => {
    const counterDoc = await getDoc(
      doc(store, `${COLLECTIONS.COUNTERS}/userIdCounter`),
    );
    let counter = 1;

    if (counterDoc.exists()) {
      const data = counterDoc.data();
      counter = (data[baseId] || 0) + 1;
    }

    let userId = counter === 1 ? baseId : `${baseId}${counter - 1}`;

    await setDoc(
      doc(store, `${COLLECTIONS.COUNTERS}/userIdCounter`),
      { [baseId]: counter },
      {
        merge: true,
      },
    );

    return userId;
  };

  const checkEmailAvailable = async (email: string, uid: string) => {
    if (!email) return;
    const snapshot = await getDocs(
      query(collection(store, COLLECTIONS.USER), where('email', '==', email)),
    );

    if (!snapshot.empty && uid !== snapshot.docs[0].id) {
      return 'unavailable';
    } else if (!snapshot.empty && uid === snapshot.docs[0].id) {
      return 'myEmail';
    } else {
      return 'available';
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
  }, [open, close, router]);

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
    [open, close, router, user, authUser],
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
