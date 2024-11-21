'use client';

import SignInForm from '@components/sign/SignInForm';
import SocialLoginButtons from '@components/sign/SocialLoginButtons';
import useUser from '@connect/user/useUser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import styles from './TemplateSign.module.scss';
import SignUpForm from '@components/sign/SignUpForm';
import { InputArr } from '@connect/sign';

export default function TemplateSign({
  title,
  inputArr,
}: {
  title: '로그인' | '회원가입';
  inputArr: InputArr[];
}) {
  const router = useRouter();
  const user = useUser();

  console.log('✅', user);
  if (user) {
    router.replace('/');
  }
  return (
    <div className={styles.signContainer}>
      <h2>{title}</h2>
      {title === '로그인' ? (
        <SignInForm inputArr={inputArr} />
      ) : (
        <SignUpForm inputArr={inputArr} />
      )}
      <SocialLoginButtons signUp={title === '로그인' ? false : true} />

      {title === '로그인' ? (
        <Link href="/join">아직 계정이 없다면, 회원가입하세요!</Link>
      ) : (
        <Link href="/login">이미 계정이 있다면, 로그인</Link>
      )}
    </div>
  );
}
