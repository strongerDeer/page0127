import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';

import { FormValues } from '@models/sign';

import { FirebaseError } from 'firebase/app';

import editProfileValidate from '@components/sign/editProfileValidate';
import { Profile } from '@models/user';
import useUser from './auth/useUser';
import EditProfile from '@remote/profile';

export const useEditProfileForm = () => {
  const router = useRouter();
  const user = useUser();

  const [profileImage, setProfileImg] = useState<string>(user?.photoURL || '');

  // controlled 방식 사용 : state 사용
  const [formValues, setFormValues] = useState<Omit<Profile, 'photoURL'>>({
    password: '',
    rePassword: '',
    displayName: user?.displayName || '',
    goal: '1',
    intro: '',
  });

  const [inputDirty, setInputDirty] = useState<Partial<FormValues>>({});

  const { edit } = EditProfile();

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

  const errors = useMemo(() => editProfileValidate(formValues), [formValues]);

  const isSubmit = Object.keys(errors).length === 0;

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
