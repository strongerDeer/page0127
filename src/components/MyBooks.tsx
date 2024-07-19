'use client';
import { COLLECTIONS } from '@constants';
import { getMyBooks } from '@remote/mybook';
import { useQuery } from 'react-query';
import Image from 'next/image';
import React from 'react';
import Chart from './my/Chart';
import { getUser } from '@remote/user';
import ActionButtons from './ActionButtons';

export default function MyBooks({ pageUid }: { pageUid: string }) {
  const { data: book } = useQuery(['myBooks'], () => getMyBooks(pageUid));

  const { data: userData } = useQuery([COLLECTIONS.USER], () =>
    getUser(pageUid),
  );

  return (
    <div>
      {userData && <ActionButtons userData={userData} />}

      <div className="flex">
        {book?.map((book) => (
          <React.Fragment key={book.id}>
            <Image src={book.flipCover} alt="" width={20} height={100} />
          </React.Fragment>
        ))}
      </div>
      <div>{userData?.category && <Chart userData={userData} />}</div>
    </div>
  );
}
