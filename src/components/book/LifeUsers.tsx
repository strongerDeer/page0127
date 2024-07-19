import Image from 'next/image';
import useLifeUsers from './useLifeUsers';
import Link from 'next/link';
import { useState } from 'react';
import Button from '@components/shared/Button';

const SHOW_USER = 5;
export default function LifeUsers({ userIds }: { userIds: string[] }) {
  const [showMore, setShowMore] = useState(false);
  const { data, isLoading } = useLifeUsers({ userIds });

  if (!data && isLoading) {
    return null;
  }

  const userList =
    (data && data?.length < SHOW_USER) || showMore
      ? data
      : data?.slice(0, SHOW_USER);

  return (
    <div>
      {userList?.map((user) => (
        <Link key={user.id} href={`/shelf/${user.id}`}>
          {user.photoURL && (
            <Image src={user.photoURL} alt="" width={100} height={100} />
          )}
          {user.displayName}
        </Link>
      ))}
      {data && data?.length > SHOW_USER && showMore === false && (
        <Button variant="outline" onClick={() => setShowMore(true)}>
          더보기
        </Button>
      )}
    </div>
  );
}
