'use client';
import useUser, { useUserLoading } from '@hooks/auth/useUser';
import { useAlertContext } from '@contexts/AlertContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (!user) {
      open({
        title: '로그인이 필요해요!',
        body: '로그인 페이지로 이동합니다',
        onButtonClick: () => {
          router.push('/signin');
        },
      });
    }
  }, [path]);

  if (isLoading) {
    return <>Loading...</>;
  }

  if (user) {
    return <>{children}</>;
  }

  return null;
}