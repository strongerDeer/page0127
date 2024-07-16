'use client';

import Tag from '@components/shared/Tag';
import { Club } from '@models/applyClub';
import { getClubs } from '@remote/club';
import restTime from '@utils/restTime';
import { differenceInMilliseconds, parseISO } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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
            <TagComponent club={club} />
            <Link href={`/club/${club.id}`}>{club.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TagComponent = ({ club }: { club: Club }) => {
  const [remainedTime, setRemainedTime] = useState(0);
  useEffect(() => {
    if (club.events === null || club.events?.promotionEndTime === null) {
      return;
    }
    const promotionEndTime = club.events?.promotionEndTime;

    if (promotionEndTime) {
      const timer = setInterval(() => {
        const restSec = differenceInMilliseconds(
          parseISO(promotionEndTime),
          new Date(),
        );

        if (restSec < 0) {
          clearInterval(timer);
        }
        setRemainedTime(restSec);
      }, 1_000);

      return () => {
        clearInterval(timer);
      };
    }
  }, [club.events]);

  const name = club.events?.name;
  const promotionTxt =
    remainedTime > 0 ? `- ${restTime(remainedTime)} 남음` : '';

  if (!name) {
    return null;
  }

  return (
    <Tag>
      {name} {promotionTxt}
    </Tag>
  );
};
