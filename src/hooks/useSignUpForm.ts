import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';
import { FirebaseError } from 'firebase/app';

import postSignUp from '@remote/sign';
import signUpValidate from '@components/sign/singUpValidate';
import { useForm } from './useForm';
import { SignUpFormValues } from '@models/sign';

export const useSignUpForm = () => {
  const router = useRouter();
  const [profileImage, setProfileImg] = useState<string>('');
  const { signUp } = postSignUp();

  const { formValues, inputDirty, handleFormValues, handleBlur } =
    useForm<SignUpFormValues>({
      email: '',
      password: '',
      rePassword: '',
      displayName: '',
    });

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
    inputDirty,
    errors,
    isSubmit,
    handleFormValues,
    handleBlur,
    handleSubmit,
    profileImage,
    setProfileImg,
  };
};
