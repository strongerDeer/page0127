import Link from 'next/link';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';

import { getProfile } from '@/entities/profile/api/getProfile';

import { ProfileDropdown } from '@/features/profile';

import { HeaderClient } from './HeaderClient';

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

  // 로그인한 경우 프로필 정보 가져오기
  const profile = user ? await getProfile(user.id) : null;

  return (
    <header className='border-b bg-white'>
      <div className='container mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
        {/* 로고 */}
        <Link href={'/'} className='text-xl font-bold'>
          page0127
        </Link>

        {/* 네비게이션 */}
        <nav className='flex items-center gap-6'>
          {user && profile ? (
            // 로그인된 사용자 메뉴
            <>
              <Link href='/feed' className='text-sm hover:text-primary'>
                피드
              </Link>
              <Link href='/books/add' className='text-sm hover:text-primary'>
                도서 추가
              </Link>
              <Link href='/search' className='text-sm hover:text-primary'>
                사용자 검색
              </Link>

              <div className='flex items-center gap-2'>
                {/* 알림 드롭다운 */}
                <HeaderClient userId={user.id} />

                {/* 프로필 드롭다운 */}
                <ProfileDropdown
                  photoUrl={profile.photo_url}
                  displayName={profile.nickname || profile.email || '사용자'}
                  username={profile.username}
                />
              </div>
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
