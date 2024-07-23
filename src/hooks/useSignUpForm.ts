import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';

import { FormValues } from '@models/sign';

import postSignUp from '@remote/sign';
import { FirebaseError } from 'firebase/app';
import signUpValidate from '@components/sign/singUpValidate';

export type SignUpFormValues = Omit<FormValues, 'photoURL'>;

export const useSignUpForm = () => {
  const router = useRouter();

  const [profileImage, setProfileImg] = useState<string>('');

  // controlled 방식 사용 : state 사용
  const [formValues, setFormValues] = useState<SignUpFormValues>({
    email: '',
    password: '',
    rePassword: '',
    nickname: '',
  });

  const [inputDirty, setInputDirty] = useState<Partial<FormValues>>({});

  const { signUp } = postSignUp();

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

  const errors = useMemo(() => signUpValidate(formValues), [formValues]);

  const isSubmit = Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await signUp(formValues, profileImage);
      toast.success('회원가입 되었습니다!');
      router.push('/');
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
          toast.error('error: 이미 사용중인 이메일입니다.');
        }
      } else {
        console.log(error);
        toast.error('회원가입 중 오류가 발생했습니다.');
      }
    }
  };

  return {
    formValues,
    profileImage,
    inputDirty,
    errors,
    isSubmit,
    handleFormValues,
    handleBlur,
    setProfileImg,
    handleSubmit,
  };
};
