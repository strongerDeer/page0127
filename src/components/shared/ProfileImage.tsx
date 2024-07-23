'use client';
import useUser from '@hooks/auth/useUser';
import Image from 'next/image';

export default function ProfileImage({
  photoURL,
  width,
}: {
  photoURL?: string;
  width?: number;
}) {
  const src = photoURL ? photoURL : '/images/no-profile.png';
  return (
    <Image
      src={src}
      alt=""
      width={width || 80}
      height={width || 80}
      className="rounded-full"
    />
  );
}
