import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';

import { FormValues } from '@models/sign';

import validate from '@components/sign/validate';

import postSign from '@remote/sign';
import { FirebaseError } from 'firebase/app';

export type SignInFormValues = Omit<
  FormValues,
  'nickname' | 'rePassword' | 'photoURL'
>;

export const useSignInForm = () => {
  const router = useRouter();

  // controlled 방식 사용 : state 사용
  const [formValues, setFormValues] = useState<SignInFormValues>({
    email: '',
    password: '',
  });

  const [inputDirty, setInputDirty] = useState<Partial<FormValues>>({});

  const { signIn } = postSign();

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
    try {
      await signIn(formValues);
      toast.success('로그인 되었습니다!');
      router.back();
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/invalid-credential') {
          toast.error('error: 이메일과 비밀번호를 다시 확인해 주세요');
        }
      } else {
        console.log(error);
        toast.error('회원가입 중 오류가 발생했습니다.');
      }
    }
  };

  return {
    formValues,
    inputDirty,
    errors,
    isSubmit,
    handleFormValues,
    handleBlur,
    handleSubmit,
  };
};
