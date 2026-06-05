'use client';

/**
 * ProfileDropdown 컴포넌트
 * 프로필 이미지 클릭 시 드롭다운 메뉴 표시
 *
 * 학습 포인트:
 * - shadcn의 DropdownMenu 사용법
 * - Avatar 컴포넌트로 프로필 이미지 표시
 * - 로그아웃 처리를 위한 서버 액션 호출
 */

import Link from 'next/link';

import { BookOpen, Home, LogOut, Settings } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

import { useLogout } from '@/features/auth/api/useLogout';

type ProfileDropdownProps = {
  /** 사용자 프로필 이미지 URL */
  photoUrl: string | null;
  /** 사용자 닉네임 또는 이메일 */
  displayName: string;
  /** 사용자 username (공개 서재 URL용) */
  username: string | null;
};

export const ProfileDropdown = ({
  photoUrl,
  displayName,
  username,
}: ProfileDropdownProps) => {
  const { logout } = useLogout();

  const handleLogout = () => {
    logout();
  };

  // 닉네임 첫 글자 (Avatar fallback용)
  const initial = displayName?.[0]?.toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'>
          <Avatar>
            <AvatarImage src={photoUrl || undefined} alt={displayName} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* 공개 서재 */}
        {username && (
          <DropdownMenuItem asChild>
            <Link href={`/${username}`} className='flex cursor-pointer items-center'>
              <Home className='mr-2 h-4 w-4' />
              <span>공개 서재</span>
            </Link>
          </DropdownMenuItem>
        )}

        {/* 내 서재 */}
        <DropdownMenuItem asChild>
          <Link href='/dashboard' className='flex cursor-pointer items-center'>
            <BookOpen className='mr-2 h-4 w-4' />
            <span>내 서재</span>
          </Link>
        </DropdownMenuItem>

        {/* 설정 */}
        <DropdownMenuItem asChild>
          <Link href='/settings' className='flex cursor-pointer items-center'>
            <Settings className='mr-2 h-4 w-4' />
            <span>설정</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* 로그아웃 */}
        <DropdownMenuItem
          onClick={handleLogout}
          className='cursor-pointer text-destructive focus:text-destructive'
        >
          <LogOut className='mr-2 h-4 w-4' />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
