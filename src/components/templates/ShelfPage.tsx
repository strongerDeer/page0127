'use client';
import ActionButtons from '@components/ActionButtons';
import MyBooks from '@components/MyBooks';
import Chart from '@components/my/Chart';
import ProgressBar from '@components/shared/ProgressBar';
import Background from '@components/shelf/Background';

import { getUser } from '@remote/user';
import { useQuery } from 'react-query';

import styles from './ShelfPage.module.scss';

import ProfileImage from '@components/shared/ProfileImage';

export default function ShelfPage({ pageUid }: { pageUid: string }) {
  const { data: userData } = useQuery(['users'], () => getUser(pageUid));
  return (
    <div>
      <Background />
      <div className={styles.wrap}>
        <div>
          <ProfileImage photoURL={userData?.photoURL || ''} />
          <p>{userData?.displayName}</p>
          <p>여기는 나를 소개하는 공간입니다</p>
          <p>
            <span>팔로워</span> <strong>00</strong>
          </p>
          <p>
            <span>팔로잉</span> <strong>00</strong>
          </p>
          {userData && <ActionButtons userData={userData} />}
          <ProgressBar value={20} total={50} />
          {userData?.category && <Chart userData={userData} />}
        </div>

        <MyBooks pageUid={pageUid} />
      </div>
    </div>
  );
}
