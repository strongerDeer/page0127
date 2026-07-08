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
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>page0127.</CardTitle>
          <CardDescription>
            어서 오세요. 당신의 책장이 기다리고 있어요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginWithGoogleButton />
          <p className='mt-4 text-center text-sm text-muted-foreground'>
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
