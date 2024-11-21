'use client';
import useUser, { useUserLoading } from '@connect/user/useUser';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useUser();
  const isLoading = useUserLoading();
  const router = useRouter();

  const checkAuth = useCallback(() => {
    if (isLoading) return;
    if (!user || user?.uid !== process.env.NEXT_PUBLIC_ADMIN_ID) {
      router.replace('/404');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    checkAuth();
  }, [user, checkAuth, router]);

  if (isLoading) {
    return <>Loading...</>;
  }

  if (user?.uid === process.env.NEXT_PUBLIC_ADMIN_ID) {
    return <>{children}</>;
  }

  return null;
}
