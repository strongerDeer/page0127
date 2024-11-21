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
  limit,
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

const getUserDataByUid = async (uid: string) => {
  try {
    if (!uid) throw new Error('사용자 UID가 필요합니다.');

    const userDoc = await getDocs(
      query(
        collection(store, `${COLLECTIONS.USER}`),
        where('uid', '==', uid),
        limit(1),
      ),
    );
    if (!userDoc.empty) {
      return userDoc.docs[0].data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw new Error('사용자 정보를 가져오는 중 오류가 발생했습니다.');
  }
};
export default function useLogin() {
  const user = useUser();
  const router = useRouter();
  const setUser = useSetRecoilState(userAtom);
  const { open, close } = useModalContext();
  const authUser = auth.currentUser;

  const createUser = async (user: UserCredential['user']) => {
    try {
      const { uid, displayName, email, photoURL } = user;
      if (!email) throw new Error('이메일이 필요합니다.');

      let baseId = email.split('@')[0] || uid;
      const userId = await getUserId(baseId);

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

      await setDoc(doc(store, `${COLLECTIONS.USER}/${userId}`), userData, {
        merge: true,
      });
      setUser(userData);
    } catch (error) {
      console.error('Error creating user documents:', error);
      toast.error('사용자 정보 생성 중 오류가 발생했습니다.');
      throw error;
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

      const userData = await getUserDataByUid(uid);

      // 1. 저장된 유저
      if (userData) {
        setUser(userData);
        toast.success('로그인 되었습니다.');
        router.push('/');
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
        await createUser(user);
        toast.success('가입되었습니다!');
        router.push('/');
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
      const existingUser = await getUserDataByUid(user.uid);
      if (existingUser) {
        toast.error('이미 존재하는 계정입니다.');
        return;
      }

      await updateProfile(user, { displayName });
      let photoURL =
        (await uploadProfileImage(user.uid, profileImage)) || user.photoURL;
      const userData = { ...user, displayName, photoURL };
      await createUser(userData);
      toast.success('가입되었습니다!');
      router.push('/');
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
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userData = await getUserDataByUid(user.uid);
      if (userData) {
        setUser(userData);
        toast.success('로그인 되었습니다.');
        router.push('/');
      }
    } catch (error) {
      emailLoginError(error);
    }
  };

  const getUserId = async (baseId: string) => {
    try {
      if (!baseId) throw new Error('기본 ID가 필요합니다.');

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
    } catch (error) {
      console.error('Error generating user ID:', error);
      throw new Error('사용자 ID 생성 중 오류가 발생했습니다.');
    }
  };

  const checkEmailAvailable = async (email: string, uid: string) => {
    try {
      if (!email) throw new Error('이메일이 필요합니다.');
      if (!uid) throw new Error('사용자 UID가 필요합니다.');

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
    } catch (error) {
      console.error('Error checking email availability:', error);
      throw new Error('이메일 확인 중 오류가 발생했습니다.');
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
    console.error('로그인 에러:', error);
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-credential':
          toast.error('이메일과 비밀번호를 다시 확인해 주세요');
          break;
        case 'auth/too-many-requests':
          toast.error(
            '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
          );
          break;
        case 'auth/network-request-failed':
          toast.error('네트워크 연결을 확인해주세요.');
          break;
        default:
          toast.error('로그인 중 오류가 발생했습니다.');
      }
    } else {
      toast.error('로그인 중 오류가 발생했습니다.');
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
          await signOut(auth);
          setUser(null);

          close();
          router.push('/');
          toast.success('로그아웃 되었습니다!');
        } catch (error) {
          console.error('로그아웃 에러:', error);
          toast.error('로그아웃 중 오류가 발생했습니다.');
        }
        close();
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
            const credential = EmailAuthProvider.credential(email, password);
            await reauthenticateWithCredential(authUser, credential);

            await deleteDoc(doc(store, COLLECTIONS.USER, uid));
            await deleteUser(authUser);
            setUser(null);

            close();
            router.push('/');
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
    [open, close, router, user, authUser, setUser],
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
      if (!authUser || !user) {
        toast.error('로그인이 필요한 작업입니다.');
        return;
      }
      if (uid !== user.uid) {
        toast.error('잘못된 접근입니다.');
        return;
      }
      open({
        title: '정말 회원 탈퇴 하시겠습니까?',
        body: '모든 데이터가 삭제되며 복구되지 않습니다',
        buttonLabel: '회원 탈퇴',
        onButtonClick: async () => {
          try {
            await reauthenticateUser(provider);

            await deleteDoc(doc(store, COLLECTIONS.USER, uid));
            await deleteUser(authUser);
            setUser(null);

            close();
            router.push('/');
            toast.success('탈퇴 되었습니다!');
          } catch (error) {
            console.error('회원 탈퇴 에러:', error);
            if (error instanceof FirebaseError) {
              if (error.code === 'auth/requires-recent-login') {
                toast.error('다시 로그인 후 시도해주세요.');
              } else {
                toast.error('회원 탈퇴 중 오류가 발생했습니다.');
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
    [open, close, router, authUser, reauthenticateUser, user, setUser],
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
