import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';
import { FirebaseError } from 'firebase/app';

import useUser from '@connect/user/useUser';
import EditPassword from '@remote/password';
import editPasswordValidate from '@components/sign/editPasswordValidate';
import { EditPasswordFormValues } from '@connect/sign';
import { useForm } from '@connect/sign/useForm';

export const useEditPasswordForm = () => {
  const user = useUser();
  const router = useRouter();
  const [profileImage, setProfileImg] = useState<string>(user?.photoURL || '');
  const { editPassword } = EditPassword();

  const { formValues, inputDirty, handleFormValues, handleBlur } =
    useForm<EditPasswordFormValues>({
      currentPassword: '',
      password: '',
      rePassword: '',
    });

  const errors = useMemo(() => editPasswordValidate(formValues), [formValues]);
  const isSubmit = Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    try {
      await editPassword(formValues);
      toast.success('수정되었습니다.');
      router.push('/my');
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/invalid-credential') {
          toast.error('기존 비밀번호가 일치하지 않습니다!');
        }
        console.log(error);
      } else {
        console.log(error);
        toast.error('수정 중 오류가 발생했습니다. 잠시후 다시 시도해 주세요');
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
