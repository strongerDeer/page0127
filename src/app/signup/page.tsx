'use client';
import SignUpForm from '@components/sign/SignUpForm';
import SocialLogin from '@components/sign/SocialBtnContainer';
import useUser from '@hooks/auth/useUser';
import { InputArr } from '@models/sign';
import { useRouter } from 'next/navigation';

// 회원가입 입력정보
const inputArr: InputArr[] = [
  {
    id: 'email',
    type: 'email',
    label: '이메일',
    placeholder: 'abc@abc.com',
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
  { id: 'nickname', type: 'text', label: '닉네임', placeholder: '2자 이상' },
];

export default function SignUpPage() {
  const router = useRouter();
  const user = useUser();

  if (user) {
    router.replace('/');
  }
  return (
    <div className="max-width">
      <h2 className="title1">회원가입</h2>
      <SignUpForm inputArr={inputArr} />
      <SocialLogin />
    </div>
  );
}
