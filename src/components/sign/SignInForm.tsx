'use client';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';

//firebase
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@firebase/firebaeApp';
import { FirebaseError } from 'firebase/app';

//lib
import { toast } from 'react-toastify';

import { FormValues, InputArr } from '@models/sign';

import Input from '@components/form/Input';
import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';

import styles from './Form.module.scss';
import validate from './validate';

type SignInFormValues = Omit<
  FormValues,
  'nickname' | 'rePassword' | 'photoURL'
>;

export default function SignInForm({ inputArr }: { inputArr: InputArr[] }) {
  const router = useRouter();

  const isMobile = false;

  // controlled 방식 사용 : state 사용
  const [formValues, setFormValues] = useState<SignInFormValues>({
    email: '',
    password: '',
  });

  const [inputDirty, setInputDirty] = useState<Partial<SignInFormValues>>({});

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

  const errors = useMemo(() => validate(formValues), [formValues]);

  const isSubmit = Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const { email, password } = formValues;

    // 데이터 전송
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('로그인 되었습니다!');
      router.back();
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/invalid-credential') {
          toast.error('error: 이메일과 비밀번호를 다시 확인해 주세요');
        }
        if (error) {
          console.log(error);
        }
      }
    }
  };

  return (
    <form className={styles.form}>
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
          text="로그인"
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
          로그인
        </Button>
      )}
    </form>
  );
}
