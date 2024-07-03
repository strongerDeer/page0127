'use client';

import { getClubs } from '@remote/club';
import Link from 'next/link';
import { useEffect } from 'react';
import { useQuery } from 'react-query';

// TODO: 페이징 처리 필요
export default function ClubListPage() {
  const { data, isLoading } = useQuery(['clubs'], () => getClubs());

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!data) {
    return null;
  }

  return (
    <div>
      ClubListPage
      <ul>
        {data.map((club) => (
          <li key={club.id}>
            <Link href={`/club/${club.id}`}>{club.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
