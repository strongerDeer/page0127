'use client';
import useUser from '@connect/user/useUser';
import Image from 'next/image';

import styles from './ProfileImage.module.scss';
export default function ProfileImage({
  photoURL,
  width,
}: {
  photoURL?: string;
  width?: number;
}) {
  const src = photoURL ? photoURL : '/images/no-profile.png';
  return (
    <div className={styles.profile} style={{ width: width }}>
      <Image
        src={src}
        alt=""
        width={width || 80}
        height={width || 80}
        priority
      />
    </div>
  );
}
