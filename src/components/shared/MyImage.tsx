import useUser from '@hooks/auth/useUser';
import Image from 'next/image';

export default function MyImage() {
  const user = useUser();
  return (
    <Image
      src={user?.photoURL || '/images/no-profile.png'}
      alt=""
      width={80}
      height={80}
      className="rounded-full"
    />
  );
}
