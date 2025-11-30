import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

import { LoginWithGoogle } from '@/features/auth/login-with-google';

/**
 * 로그인 페이지
 *
 * - FSD 구조: features/auth의 LoginWithGoogle 컴포넌트 사용
 */
const LoginPage = () => {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>page0127.</CardTitle>
          <CardDescription>당신의 독서 DNA를 발견하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginWithGoogle />
          <p className='mt-4 text-center text-sm text-gray-500'>
            로그인하면{' '}
            <a href='#' className='underline'>
              서비스 약관
            </a>{' '}
            및{' '}
            <a href='#' className='underline'>
              개인정보 처리방침
            </a>
            에 동의하는 것으로 간주됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
