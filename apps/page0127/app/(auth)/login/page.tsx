import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';

import { OAuthLoginButtons } from '@/features/auth/ui/OAuthLoginButtons';

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

/**
 * 로그인 페이지
 *
 * 학습 포인트: `?redirect=` 를 여기(Server Component)에서 읽어 버튼에 내린다.
 * 클라이언트에서 useSearchParams 로 읽으면 Suspense 경계가 필요해지는데,
 * 페이지가 이미 서버에서 파라미터를 받을 수 있으므로 그럴 이유가 없다.
 */
const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const { redirect } = await searchParams;

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <Card className='w-full max-w-md shadow-none'>
        <CardHeader className='text-center'>
          <CardTitle className='heading-1'>page0127.</CardTitle>
          <CardDescription>어서 오세요. 책장이 기다리고 있어요.</CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthLoginButtons next={redirect} />
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
