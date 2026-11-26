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
          // 동그라미만 둔다 — 바로 옆 ☰ 가 이미 "메뉴" 신호라 ▾ 까지 두면 겹쳐 보였다(2026-11-26 HJ A안).
          // 테두리는 키보드로 왔을 때만(focus-visible). focus 로 두면 마우스로 눌러도 굵은 파란 고리가 남았다.
          // 마우스를 올리면 살짝 어두워져 누를 수 있는 곳임을 알린다.
          // 얇은 회색 테두리는 늘 둔다 — 흰 바탕 프로필 그림이 머리글 흰 바탕에 묻혀 동그라미가 안 보였다(HJ "테두리 필요").
          className='rounded-full border border-line transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=open]:brightness-95'
        >
          <Avatar>
            <AvatarImage src={photoUrl || undefined} alt='' />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
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
