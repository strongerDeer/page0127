'use client';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';

import styles from './Form.module.scss';

import Input from '@components/shared/Input';
import FixedBottomButton from '@components/FixedBottomButton';
import { FormValues } from '@models/signup';
import validate from '@utils/validate';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, store } from '@firebase/firebaeApp';
import { collection, doc, setDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { toast } from 'react-toastify';

export default function Form() {
  // controlled 방식 사용 : state 사용
  const [formValues, setFormValues] = useState<FormValues>({
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
      [name]: true,
    }));
  }, []);

  const errors = useMemo(() => validate(formValues), [formValues]);

  const isSubmit = Object.keys(errors).length === 0;

  const handleSubmit = async (formValues: FormValues) => {
    const { email, password, nickname } = formValues;
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      await updateProfile(user, { displayName: nickname });

      const newUser = {
        uid: user.uid,
        email: user.email,
        displayName: nickname,
        // 프로필 이미지 추가 필요
        photoURL: null,
        provider: null,
      };

      await setDoc(doc(store, COLLECTIONS.USER, user.uid), newUser);

      toast.success('회원가입 되었습니다!');
    } catch (error) {
      if (error) {
        console.log(error);
        toast.error('error', error);
      }
    }
  };

  return (
    <form className={styles.form}>
      <Input
        type="email"
        id="id"
        name="email"
        label="이메일"
        placeholder="이메일"
        value={formValues.email}
        onChange={handleFormValues}
        hasError={Boolean(inputDirty.email) && Boolean(errors?.email)}
        helpMessage={
          Boolean(inputDirty.email) && errors?.email ? errors.email : null
        }
        onBlur={handleBlur}
      />
      <Input
        type="password"
        name="password"
        id="pw"
        label="패스워드"
        placeholder="패스워드"
        value={formValues.password}
        onChange={handleFormValues}
        hasError={Boolean(inputDirty.password) && Boolean(errors?.password)}
        helpMessage={
          Boolean(inputDirty.password) && errors?.password
            ? errors.password
            : null
        }
        onBlur={handleBlur}
      />
      <Input
        type="password"
        name="rePassword"
        id="pw2"
        label="패스워드 재확인"
        placeholder="패스워드 재확인"
        value={formValues.rePassword}
        onChange={handleFormValues}
        hasError={Boolean(inputDirty.rePassword) && Boolean(errors?.rePassword)}
        helpMessage={
          Boolean(inputDirty.rePassword) && errors?.rePassword
            ? errors.rePassword
            : null
        }
        onBlur={handleBlur}
      />
      <Input
        id="nickname"
        name="nickname"
        label="닉네임"
        placeholder="닉네임"
        value={formValues.nickname}
        onChange={handleFormValues}
        hasError={Boolean(inputDirty.nickname) && Boolean(errors?.nickname)}
        helpMessage={
          Boolean(inputDirty.nickname) && errors?.nickname
            ? errors.nickname
            : null
        }
        onBlur={handleBlur}
      />

      <FixedBottomButton
        type="submit"
        text="회원가입"
        disabled={!isSubmit}
        onClick={() => handleSubmit(formValues)}
      />
    </form>
  );
}
