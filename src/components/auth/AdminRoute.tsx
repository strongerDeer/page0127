'use client';
import useUser, { useUserLoading } from '@connect/user/useUser';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const user = useUser();
  const isLoading = useUserLoading();
  const router = useRouter();

  const checkAuth = useCallback(() => {
    if (!isLoading && !user) {
      router.push('/404');
    }
    if (user?.uid !== process.env.NEXT_PUBLIC_ADMIN_ID) {
      router.push('/404');
    }
  }, [user, router, isLoading]);

  useEffect(() => {
    checkAuth();
  }, [user, checkAuth, path]);

  if (isLoading) {
    return <>Loading...</>;
  }

  if (user) {
    return <>{children}</>;
  }

  return null;
}
