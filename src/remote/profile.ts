'use client';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';

import { COLLECTIONS } from '@constants';
import { SignUpFormValues } from '@hooks/useSignUpForm';
import { auth, storage, store } from '@firebase/firebaseApp';

import { v4 as uuidv4 } from 'uuid';

import { useSetRecoilState } from 'recoil';
import { userAtom } from '@atoms/user';
import { User } from '@models/user';
import useUser from '@hooks/auth/useUser';

export default function EditProfile() {
  const user = useUser();
  const setUser = useSetRecoilState(userAtom);
  const edit = async (formValues: SignUpFormValues, profileImage: string) => {
    if (auth.currentUser) {
      // 프로필 이미지 경로 생성

      let photoURL = user?.photoURL;

      if (profileImage !== '' && user?.photoURL !== profileImage) {
        // 1. 이미지 키 생성
        const imgKey = `${auth.currentUser.uid}/${uuidv4()}`;

        // 2. firebase storage에 이미지 저장
        const storageRef = ref(storage, imgKey);
        const data = await uploadString(storageRef, profileImage, 'data_url');
        photoURL = await getDownloadURL(data?.ref);
      }

      // 기본 로그인 업데이트
      await updateProfile(auth.currentUser, {
        displayName: formValues.displayName,
        photoURL: photoURL,
      });
      // users 정보 업데이트
      await updateDoc(
        doc(collection(store, COLLECTIONS.USER), auth.currentUser.uid),
        {
          displayName: formValues.displayName,
          goal: formValues.goal,
          intro: formValues.intro,
          photoURL: photoURL,
        },
      );

      setUser({
        ...user,
        displayName: formValues.displayName,
        goal: formValues.goal,
        intro: formValues.intro,
        photoURL: photoURL,
      } as User);
    }
  };

  return { edit };
}

/*
// 비밀번호 변경
await updatePassword(auth.currentUser, formValues.password);
*/
