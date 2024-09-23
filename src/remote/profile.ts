'use client';
import { collection, doc, updateDoc } from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadString,
} from 'firebase/storage';
import { updateProfile } from 'firebase/auth';

import { COLLECTIONS, STORAGE_DOWNLOAD_URL_STR } from '@constants';
import { auth, storage, store } from '@firebase/firebaseApp';

import { v4 as uuidv4 } from 'uuid';

import { useSetRecoilState } from 'recoil';
import { userAtom } from '@atoms/user';
import { User } from '@connect/user';
import useUser from '@connect/user/useUser';
import { SignUpFormValues } from '@models/sign';

export default function EditProfile() {
  const user = useUser();
  const setUser = useSetRecoilState(userAtom);
  const edit = async (formValues: SignUpFormValues, profileImage: string) => {
    if (auth.currentUser) {
      // 기존 이미지 삭제
      if (user?.photoURL !== profileImage) {
        deleteImageInStorage(user?.photoURL as string);
      }
      // 프로필 이미지 경로 생성
      let photoURL = user?.photoURL;

      if (user?.photoURL !== null && profileImage === '') {
        photoURL = null;
      } else if (profileImage !== '' && user?.photoURL !== profileImage) {
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
          intro: formValues.intro,
          photoURL: photoURL,
        },
      );

      setUser({
        ...user,
        displayName: formValues.displayName,
        intro: formValues.intro,
        photoURL: photoURL,
      } as User);
    }
  };

  return { edit };
}

const deleteImageInStorage = async (imgUrl: string) => {
  if (!imgUrl || !imgUrl.includes(STORAGE_DOWNLOAD_URL_STR)) return;

  try {
    await deleteObject(ref(storage, imgUrl));
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

/*
// 비밀번호 변경
await updatePassword(auth.currentUser, formValues.password);
*/
