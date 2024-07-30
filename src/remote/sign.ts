import { doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

import { COLLECTIONS } from '@constants';
import { auth, storage, store } from '@firebase/firebaseApp';

import { v4 as uuidv4 } from 'uuid';
import { SignInFormValues, SignUpFormValues } from '@models/sign';

export default function postSign() {
  const signUp = async (formValues: SignUpFormValues, profileImage: string) => {
    const { email, password, displayName } = formValues;

    await createUserWithEmailAndPassword(auth, email, password).then(
      async ({ user }) => {
        await updateProfile(user, {
          displayName: displayName,
        });
        // 프로필 이미지 경로 생성
        let photoURL = null;

        if (profileImage !== '') {
          // 1. 이미지키 생성
          const imgKey = `${user.uid}/${uuidv4()}`;

          // 2. firebase storage에 이미지 저장
          const storageRef = ref(storage, imgKey);
          const data = await uploadString(storageRef, profileImage, 'data_url');
          photoURL = await getDownloadURL(data?.ref);
        }

        // 회원정보 추가!
        if (auth.currentUser) {
          //회원 정보 저장
          const newUser = {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            photoURL: photoURL,
            provider: null,
          };

          await setDoc(doc(store, COLLECTIONS.USER, user.uid), newUser);
        }
      },
    );
  };
  const signIn = async (formValues: SignInFormValues) => {
    const { email, password } = formValues;
    await signInWithEmailAndPassword(auth, email, password);
  };
  return { signUp, signIn };
}
