import { useMemo, useState } from 'react';

import { SignUpFormValues } from '.';
import signUpValidate from '@components/sign/singUpValidate';
import { useForm } from './useForm';

export const useSignUpForm = () => {
  const [profileImage, setProfileImg] = useState<string>('');

  const { formValues, inputDirty, handleFormValues, handleBlur } =
    useForm<SignUpFormValues>({
      email: '',
      password: '',
      rePassword: '',
      displayName: '',
    });

  const errors = useMemo(() => signUpValidate(formValues), [formValues]);
  const isSubmit = Object.keys(errors).length === 0;

  return {
    formValues,
    inputDirty,
    errors,
    isSubmit,
    handleFormValues,
    handleBlur,
    profileImage,
    setProfileImg,
  };
};
