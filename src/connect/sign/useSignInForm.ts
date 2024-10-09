import { useMemo } from 'react';

import { SignInFormValues } from '.';

import signInValidate from '@components/sign/signInValidate';
import { useForm } from './useForm';

export const useSignInForm = () => {
  const { formValues, inputDirty, handleFormValues, handleBlur } =
    useForm<SignInFormValues>({ email: '', password: '' });

  const errors = useMemo(() => signInValidate(formValues), [formValues]);
  const isSubmit = Object.keys(errors).length === 0;

  return {
    formValues,
    inputDirty,
    errors,
    isSubmit,
    handleFormValues,
    handleBlur,
  };
};
