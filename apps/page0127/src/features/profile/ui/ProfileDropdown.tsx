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

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';
import {
  Award,
  BookOpen,
  CalendarDays,
  ChevronDown,
  LogOut,
  Quote,
  Settings,
  Sparkles,
} from 'lucide-react';

import { nameInitials } from '@/entities/profile/model/displayName';
import { getMyLibraryLinks } from '@/entities/profile/model/myLibraryLinks';

import { useLogout } from '@/features/auth/api/useLogout';

import type { MyLibraryLinkKey } from '@/entities/profile/model/myLibraryLinks';

const MY_LIBRARY_ICONS: Record<MyLibraryLinkKey, typeof BookOpen> = {
  library: BookOpen,
  quotes: Quote,
  recap: CalendarDays,
  badges: Award,
  taste: Sparkles,
};

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

  // 닉네임 첫 글자 (Avatar fallback용).
  // `displayName[0]` 로 직접 자르면 이모지 닉네임에서 서로게이트가 쪼개져
  // hydration 이 깨진다 — 근거는 nameInitials 주석 참조.
  const initial = nameInitials(displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          aria-label={`${displayName} 메뉴`}
          className='flex items-center gap-1 rounded-full text-text-subtle hover:text-text-strong focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        >
          <Avatar>
            <AvatarImage src={photoUrl || undefined} alt='' />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          {/* 동그라미만 있으면 눌러서 열리는 메뉴인 줄 몰라서 ▾ 를 붙였다(2026-11-26 점검) */}
          <ChevronDown aria-hidden='true' className='size-4' />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/*
          내 서재와 거기 딸린 곳 — 문장 서랍·주간 회상·배지·AI 취향 분석은 서재 안 내용이라
          상단 메뉴 칸 대신 여기서 닿는다(2026-11-26 HJ). 폰 ☰ 목차와 같은 목록(getMyLibraryLinks).
        */}
        {getMyLibraryLinks(username).map(({ key, href, label }) => {
          const Icon = MY_LIBRARY_ICONS[key];
          return (
            <DropdownMenuItem key={key} asChild>
              <Link href={href} className='flex cursor-pointer items-center'>
                <Icon className='mr-2 h-4 w-4' />
                <span>{label}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

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
