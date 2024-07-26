import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';
import { FirebaseError } from 'firebase/app';

import EditProfile from '@remote/profile';
import editProfileValidate from '@components/sign/editProfileValidate';
import { useForm } from './useForm';

import useUser from './auth/useUser';
import { EditFormValues } from '@models/sign';

export const useEditProfileForm = () => {
  const user = useUser();
  const router = useRouter();
  const [profileImage, setProfileImg] = useState<string>(user?.photoURL || '');
  const { edit } = EditProfile();

  const { formValues, inputDirty, handleFormValues, handleBlur } =
    useForm<EditFormValues>({
      displayName: user?.displayName || '',
      goal: user?.goal || '1',
      intro: user?.intro || '',
    });

  const isProfileChanged = useMemo(() => {
    if (!user) return false;
    return (
      user.displayName !== formValues.displayName ||
      user.goal !== formValues.goal ||
      user.intro !== formValues.intro ||
      user.photoURL !== profileImage
    );
  }, [user, formValues, profileImage]);

  const errors = useMemo(() => editProfileValidate(formValues), [formValues]);
  const isSubmit = Object.keys(errors).length === 0 && isProfileChanged;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await edit(formValues, profileImage);
      toast.success('수정되었습니다.');
      router.push('/my');
    } catch (error) {
      if (error instanceof FirebaseError) {
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
