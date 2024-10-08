'use client';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';
import { getClub } from '@remote/club';

import { useRouter } from 'next/navigation';
import { useQuery } from 'react-query';

export default function ClubPage({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading } = useQuery(['club', id], () => getClub(id));

  if (isLoading) {
    <>Loading...</>;
  }
  if (!data) {
    return null;
  }
  return (
    <div>
      {data?.title} 독서모임 상세
      <ButtonFixedBottom
        text="모임에 바로 신청하고 혜택받기!"
        onClick={() => router.push(`/club/${id}/apply`)}
      />
    </div>
  );
}
