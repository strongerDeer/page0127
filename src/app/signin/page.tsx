import SignInForm from '@components/sign/SignInForm';
import SocialLogin from '@components/sign/SocialBtnContainer';
import { InputArr } from '@models/Sign';
import Link from 'next/link';

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
  return (
    <div className="max-width">
      <h2 className="title1">로그인</h2>
      <SignInForm inputArr={inputArr} />
      <SocialLogin />

      <Link href="/auth/signup">아직 계정이 없으신가요?</Link>
    </div>
  );
}
