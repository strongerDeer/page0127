'use client';
import useUser from '@hooks/auth/useUser';
import Image from 'next/image';

export default function MyImage({ width }: { width?: number }) {
  const user = useUser();
  return (
    <Image
      src={user?.photoURL ?? '/images/no-profile.png'}
      alt=""
      width={width || 80}
      height={width || 80}
      className="rounded-full"
    />
  );
}
