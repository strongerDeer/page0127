import Link from 'next/link';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';

import { LogoutButton } from '@/features/auth/ui/LogoutButton';

/**
 * 공통 헤더 컴포넌트 (Server Component)
 *
 * 학습 포인트:
 * - 로그인 상태에 따라 다른 UI 표시
 * - Server Component에서 직접 인증 체크 가능 (await 사용)
 * - 조건부 렌더링으로 로그인/비로그인 상태 처리
 */
export const Header = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className='border-b bg-white'>
      <div className='container mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
        {/* 로고 */}
        <Link href={'/'} className='text-xl font-bold'>
          page0127
        </Link>

        {/* 네비게이션 */}
        <nav className='flex items-center gap-6'>
          {user ? (
            // 로그인된 사용자 메뉴
            <>
              <Link href='/dashboard' className='hover:text-primary'>
                대시보드
              </Link>
              <Link href='/books' className='hover:text-primary'>
                내 서재
              </Link>
              <Link href='/books/add' className='hover:text-primary'>
                도서 추가
              </Link>
              <LogoutButton />
            </>
          ) : (
            // 비로그인 사용자 메뉴
            <>
              <Link href='/login'>
                <Button variant='ghost'>로그인</Button>
              </Link>
              <Link href='/login'>
                <Button>시작하기</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
