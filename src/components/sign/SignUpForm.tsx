'use client';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';

//firebase
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, store } from '@firebase/firebaeApp';
import { doc, setDoc } from 'firebase/firestore';

//lib
import { toast } from 'react-toastify';

import { FormValues, InputArr } from '@models/sign';
import { COLLECTIONS } from '@constants';

import Input from '@components/form/Input';
import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';

import styles from './Form.module.scss';
import validate from './validate';

// 프로필이미지 관련
import { storage } from '@firebase/firebaeApp';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import InputFileImg from '@components/form/InputFileImg';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseError } from 'firebase/app';

export default function SignUpForm({ inputArr }: { inputArr: InputArr[] }) {
  const router = useRouter();
  const isMobile = false;
  const [profileImage, setProfileImg] = useState<string>('');
  // controlled 방식 사용 : state 사용
  const [formValues, setFormValues] = useState<Omit<FormValues, 'photoURL'>>({
    email: '',
    password: '',
    rePassword: '',
    nickname: '',
  });

  const [inputDirty, setInputDirty] = useState<Partial<FormValues>>({});

  // 계속해서 리렌더링 발생. 외부 값의 영향을 받지 않음으로 useCallback 사용
  const handleFormValues = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setInputDirty((prev) => ({
      ...prev,
      [name]: 'true',
    }));
  }, []);

  const errors = useMemo(() => validate(formValues, 'signUp'), [formValues]);

  const isSubmit = Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const { email, password, nickname } = formValues;

    // 데이터 전송
    try {
      // 회원가입
      await createUserWithEmailAndPassword(auth, email, password).then(
        async ({ user }) => {
          await updateProfile(user, { displayName: nickname });

          // 프로필 이미지 경로 생성
          let photoURL = null;
          if (profileImage !== '') {
            // 1. 이미지키 생성
            const imgKey = `${user.uid}/${uuidv4()}`;

            // 2. firebase storage에 이미지 저장
            const storageRef = ref(storage, imgKey);
            const data = await uploadString(
              storageRef,
              profileImage,
              'data_url',
            );
            photoURL = await getDownloadURL(data?.ref);
          }

          // 회원정보 추가!
          if (auth.currentUser) {
            //회원 정보 저장
            const newUser = {
              uid: user.uid,
              email: user.email,
              displayName: nickname,
              photoURL: photoURL,
              provider: null,
            };

            try {
              await setDoc(doc(store, COLLECTIONS.USER, user.uid), newUser);
              toast.success('회원가입 되었습니다!');
              router.push('/');
            } catch (error) {
              console.log(error);
            }
          }
        },
      );
    } catch (error) {
      if (error instanceof FirebaseError) {
        toast.error(error.code);
      }
      if (error) {
        console.log(error);
      }
    }
  };

  return (
    <form className={styles.form}>
      <InputFileImg value={profileImage} setValue={setProfileImg} />
      {/* input */}
      {inputArr.map(({ id, type, label, placeholder }) => (
        <Input
          key={id}
          type={type}
          id={id}
          name={id}
          label={label}
          placeholder={placeholder}
          value={formValues[id]}
          hasError={Boolean(inputDirty[id]) && Boolean(errors?.[id])}
          helpMessage={
            Boolean(inputDirty[id]) && errors[id] ? errors[id] : null
          }
          onChange={handleFormValues}
          onBlur={handleBlur}
        />
      ))}

      {isMobile ? (
        <ButtonFixedBottom
          type="submit"
          text="회원가입"
          disabled={isSubmit === false}
          onClick={() => handleSubmit}
        />
      ) : (
        <Button
          type="submit"
          size="lg"
          disabled={isSubmit === false}
          onClick={handleSubmit}
        >
          회원가입
        </Button>
      )}
    </form>
  );
}
