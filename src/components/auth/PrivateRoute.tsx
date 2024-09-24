'use client';
import useUser, { useUserLoading } from '@connect/user/useUser';
import { useAlertContext } from '@contexts/AlertContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';

export default function PrivateRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const user = useUser();
  const isLoading = useUserLoading();
  const router = useRouter();
  const { open } = useAlertContext();

  const checkAuth = useCallback(() => {
    if (isLoading) return;

    if (!isLoading && !user) {
      open({
        title: '로그인이 필요해요!',
        body: '로그인 페이지로 이동합니다',
        onButtonClick: () => {
          router.push('/signin');
        },
      });
    }
  }, [user, open, router, isLoading]);

  useEffect(() => {
    checkAuth();
  }, [user, checkAuth, path, router]);

  if (isLoading) {
    return <>Loading...</>;
  }

  if (user) {
    return <>{children}</>;
  }

  return null;
}
