'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';

import { useCurrentUserContext, userKeys } from '@/entities/user';

import { AppShellLayout } from './AppShellLayout';

import type { ShellUser } from '../api/getShellUser';

/**
 * 서버에서 로그인을 읽지 않는 셸 — CDN 에 미리 만들어 두는(ISR) 공개 페이지용.
 *
 * (public) 레이아웃은 서버에서 getCurrentUser() 로 쿠키를 읽는다. 쿠키를 읽으면 Next 는
 * 그 페이지를 "사람마다 다르다"고 보고 캐시하지 않아서, 봇이 한 번 들를 때마다 서버 함수가 돌았다
 * (2026-11-11 Vercel Fluid Active CPU 한도 초과).
 *
 * 여기서는 같은 AppShellLayout 을 쓰되 사용자 정보를 브라우저에서 채운다.
 * 1. CurrentUserProvider 가 이미 모든 페이지에서 /api/auth/me 를 부른다 → 그 답으로 로그인 여부를 안다
 * 2. 로그인한 사람만 /api/auth/shell 로 사진·이름을 받는다 (비로그인은 추가 호출 없음)
 * 3. 받기 전까지는 비로그인 모양으로 그린다 — 0.2초쯤 "로그인" 버튼이 보였다가 바뀔 수 있다
 */
export const ClientAppShellLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { currentUser } = useCurrentUserContext();

  const { data: shellUser } = useQuery({
    queryKey: [...userKeys.me(), 'shell'] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<ShellUser | null>('/auth/shell');
      return data;
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <AppShellLayout user={currentUser ? (shellUser ?? null) : null}>
      {children}
    </AppShellLayout>
  );
};
