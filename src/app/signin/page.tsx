'use client';
import SignInForm from '@components/sign/SignInForm';
import SocialLoginButtons from '@components/sign/SocialLoginButtons';
import useUser from '@hooks/auth/useUser';
import { InputArr } from '@models/sign';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 로그인 입력정보
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
];
// 로그인 페이지
export default function SignInPage() {
  const router = useRouter();
  const user = useUser();
  if (user) {
    router.replace('/');
  }
  return (
    <div className="max-width">
      <h2 className="title1">로그인</h2>
      <SignInForm inputArr={inputArr} />
      <SocialLoginButtons />

      <Link href="/auth/signup">아직 계정이 없으신가요?</Link>
    </div>
  );
}
