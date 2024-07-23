'use client';
import { userAtom } from '@atoms/user';
import Input from '@components/form/Input';
import InputFileImg from '@components/form/InputFileImg';
import Button from '@components/shared/Button';
import signUpValidate from '@components/sign/singUpValidate';
import { COLLECTIONS } from '@constants';
import { auth, store } from '@firebase/firebaseApp';
import useUser from '@hooks/auth/useUser';
import { FormValues, InputArr } from '@models/sign';
import { User } from '@models/user';
import { FirebaseError } from 'firebase/app';
import { updateProfile } from 'firebase/auth';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useSetRecoilState } from 'recoil';

// 입력정보
const inputArr: InputArr[] = [
  {
    id: 'password',
    type: 'password',
    label: '비밀번호',
    placeholder: '8자 이상',
  },
  {
    id: 'rePassword',
    type: 'password',
    label: '비밀번호 확인',
    placeholder: '8자 이상',
  },
  { id: 'nickname', type: 'text', label: '닉네임', placeholder: '2자 이상' },
];

type EditFormValues = Omit<FormValues, 'email'>;

export default function MyEditPage() {
  const user = useUser();
  const setUser = useSetRecoilState(userAtom);

  const [profileImage, setProfileImg] = useState<string>(user?.photoURL || '');
  const [formValues, setFormValues] = useState<Omit<FormValues, 'email'>>({
    password: '',
    rePassword: '',
    nickname: '',
    photoURL: '',
  });

  const [inputDirty, setInputDirty] = useState<Partial<EditFormValues>>({});

  const errors = useMemo(() => signUpValidate(formValues), [formValues]);
  const isSubmit = Object.keys(errors).length === 0;

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: '',
          photoURL: '',
        });

        await updateDoc(
          doc(collection(store, COLLECTIONS.USER), auth.currentUser.uid),
          {
            displayName: '',
            photoURL: '',
          },
        );

        setUser({ ...user, photoURL: '' } as User);
      }
    } catch (error) {
      if (error instanceof FirebaseError) {
        toast.error(error.code);
      }
      if (error) {
        console.log(error);
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <InputFileImg value={profileImage} setValue={setProfileImg} />
        {inputArr.map(({ id, type, label, placeholder }) => (
          <Input
            key={id}
            type={type}
            id={id}
            name={id}
            label={label}
            placeholder={placeholder}
            value={formValues[id]}
            hasError={Boolean(inputDirty[id]) && Boolean(errors?.[id])}
            helpMessage={
              Boolean(inputDirty[id]) && errors[id] ? errors[id] : null
            }
            onChange={handleFormValues}
            onBlur={handleBlur}
          />
        ))}

        <Button type="submit" size="lg" disabled={isSubmit === false}>
          회원 정보 수정
        </Button>
      </form>
    </div>
  );
}
