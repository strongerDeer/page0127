import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

import { LoginWithGoogleButton } from '@/features/auth/ui/LoginWithGoogleButton';

// 로그인 페이지

const LoginPage = () => {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <Card className='w-full max-w-md shadow-none'>
        <CardHeader className='text-center'>
          <CardTitle className='heading-1'>page0127.</CardTitle>
          <CardDescription>어서 오세요. 책장이 기다리고 있어요.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginWithGoogleButton />
          {/* 약관 링크는 실제 페이지로 연결한다 (기존 href='#' 죽은 링크) */}
          <p className='mt-4 text-center text-sm text-text-subtle'>
            로그인하면{' '}
            <Link href='/terms' className='underline'>
              서비스 약관
            </Link>{' '}
            및{' '}
            <Link href='/privacy' className='underline'>
              개인정보 처리방침
            </Link>
            에 동의하는 것으로 간주됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
