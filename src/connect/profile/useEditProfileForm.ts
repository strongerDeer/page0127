import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';
import { FirebaseError } from 'firebase/app';

import EditProfile from '@remote/profile';
import editProfileValidate from '@components/sign/editProfileValidate';

import useUser from '@connect/user/useUser';
import { useForm } from '@connect/sign/useForm';
import { EditFormValues } from '@connect/sign';
import { useSetRecoilState } from 'recoil';
import { userAtom } from '@atoms/user';

export const useEditProfileForm = () => {
  const setUser = useSetRecoilState(userAtom);
  const user = useUser();
  const router = useRouter();
  const [profileImage, setProfileImg] = useState<string>(user?.photoURL || '');
  const [backgroundImage, setBackgroundImg] = useState<string>(
    user?.backgroundURL || '',
  );
  const { edit } = EditProfile();

  const { formValues, inputDirty, handleFormValues, handleBlur } =
    useForm<EditFormValues>({
      displayName: user?.displayName || '',
      introduce: user?.introduce || '',
    });

  const isProfileChanged = useMemo(() => {
    if (!user) return false;
    return (
      user.displayName !== formValues.displayName ||
      user.introduce !== formValues.introduce ||
      user.photoURL !== profileImage ||
      user.backgroundURL !== backgroundImage
    );
  }, [user, formValues, profileImage, backgroundImage]);

  const errors = useMemo(() => editProfileValidate(formValues), [formValues]);
  const isSubmit = Object.keys(errors).length === 0 && isProfileChanged;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await edit(formValues, profileImage, backgroundImage);

      setUser((prev) => ({
        ...prev!,
        ...formValues,
        photoURL: profileImage,
        backgroundURL: backgroundImage,
      }));

      toast.success('수정되었습니다.');
      router.replace(`/${user?.userId}`);
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
    backgroundImage,
    setBackgroundImg,
  };
};
