import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

import { LogoutButton } from '@/features/auth/ui/LogoutButton';

/**
 * 대시보드 페이지
 *
 * 학습 포인트:
 * - Server Component로 구현 (async 함수 가능)
 * - 서버에서 사용자 정보 조회
 * - 인증되지 않은 경우 로그인 페이지로 리디렉션
 */
const DashboardPage = async () => {
  const supabase = await createClient();

  // 현재 로그인한 사용자 정보 조회
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인하지 않은 경우 로그인 페이지로 리디렉션
  if (!user) {
    redirect('/login');
  }

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='mx-auto max-w-4xl'>
        <div className='mb-6 flex items-center justify-between'>
          <h1 className='text-3xl font-bold'>대시보드</h1>
          <LogoutButton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>환영합니다!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-2 text-gray-600'>
              <strong>이메일:</strong> {user.email}
            </p>
            <p className='text-gray-600'>
              <strong>사용자 ID:</strong> {user.id}
            </p>
            <div className='mt-6 rounded-lg bg-blue-50 p-4'>
              <p className='mb-4 text-sm text-blue-800'>
                📚 도서 검색 및 독서 기록 기능을 사용해보세요!
              </p>
              <div className='flex gap-3'>
                <Link href='/books'>
                  <Button variant='outline'>내 서재</Button>
                </Link>
                <Link href='/books/add'>
                  <Button>도서 추가</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
