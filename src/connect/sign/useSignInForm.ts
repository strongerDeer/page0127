import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';
import { FirebaseError } from 'firebase/app';

import { SignInFormValues } from './';
import postSign from './sign';
import signInValidate from '@components/sign/signInValidate';
import { useForm } from './useForm';

export const useSignInForm = () => {
  const router = useRouter();
  const { signIn } = postSign();
  const { formValues, inputDirty, handleFormValues, handleBlur } =
    useForm<SignInFormValues>({ email: '', password: '' });

  const errors = useMemo(() => signInValidate(formValues), [formValues]);
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
