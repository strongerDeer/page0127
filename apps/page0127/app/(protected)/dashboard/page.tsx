import Link from 'next/link';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { StatCard } from '@/shared/ui/StatCard';

import { getBookStats } from '@/entities/book/api/getBookStats';

import { LogoutButton } from '@/features/auth/ui/LogoutButton';

/**
 * 대시보드 페이지
 *
 * 학습 포인트:
 * - Server Component로 구현 (async 함수 가능)
 * - 서버에서 사용자 정보 및 통계 데이터 조회
 * - 병렬 데이터 페칭으로 성능 최적화 가능 (향후 개선)
 * - (protected) layout.tsx에서 인증 체크하므로 여기서는 불필요
 */
const DashboardPage = async () => {
  const supabase = await createClient();

  // 현재 로그인한 사용자 정보 조회
  // layout.tsx에서 이미 인증 체크했으므로 user는 항상 존재
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 통계 데이터 조회
  const stats = await getBookStats(user!.id);

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-6 flex items-center justify-between'>
          <h1 className='text-3xl font-bold'>대시보드</h1>
          <LogoutButton />
        </div>

        {/* 통계 카드 그리드 */}
        <div className='mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <StatCard
            icon='📚'
            title='총 읽은 책'
            value={stats.totalCompletedBooks}
            unit='권'
          />
          <StatCard
            icon='📖'
            title='총 읽은 쪽수'
            value={stats.totalPages}
            unit='쪽'
            description='향후 구현 예정'
          />
          <StatCard
            icon='🎯'
            title='연간 목표'
            value={stats.yearlyGoal}
            unit='권'
          />
          <StatCard
            icon='✅'
            title='완독률'
            value={stats.completionRate}
            unit='%'
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>환영합니다!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-2 text-gray-600'>
              <strong>이메일:</strong> {user!.email}
            </p>
            <p className='text-gray-600'>
              <strong>사용자 ID:</strong> {user!.id}
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
