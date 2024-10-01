'use client';
import TemplateEditPassword from '@components/templates/TemplateEditPassword';
import { InputArr } from '@connect/sign';
import useUser from '@connect/user/useUser';

import { useRouter } from 'next/navigation';

// 입력정보
const inputArr: InputArr[] = [
  {
    id: 'currentPassword',
    type: 'password',
    label: '기존 비밀번호',
    placeholder: '8자 이상',
  },
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
];

export default function MyEditPage() {
  const user = useUser();
  const router = useRouter();

  if (user?.provider) {
    router.replace('/my');
  } else {
    return <TemplateEditPassword inputArr={inputArr} />;
  }
}
