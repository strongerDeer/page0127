'use client';
import useUser from '@hooks/auth/useUser';
import { useAlertContext } from '@contexts/AlertContext';
import { useRouter } from 'next/navigation';

export default function PrivateRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useUser();
  const router = useRouter();

  const { open } = useAlertContext();

  if (!user) {
    open({
      title: '로그인이 필요해요!',
      body: '로그인 페이지로 이동합니다',
      onButtonClick: () => {
        router.push('/signin');
      },
    });
  } else {
    return <>{children}</>;
  }
  return null;
}
