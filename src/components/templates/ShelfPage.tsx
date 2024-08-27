'use client';
import ActionButtons from '@components/ActionButtons';
import MyBooks from '@components/MyBooks';
import Chart from '@components/my/Chart';
import ProgressBar from '@components/shared/ProgressBar';
import Background from '@components/shelf/Background';

import { getUser } from '@remote/user';
import { useQuery } from 'react-query';

import styles from './ShelfPage.module.scss';
import FollowButton from '@components/follow/FollowButton';
import ProfileImage from '@components/shared/ProfileImage';

export default function ShelfPage({ pageUid }: { pageUid: string }) {
  const { data: userData } = useQuery(['users'], () => getUser(pageUid));

  return (
    <div>
      <Background />
      <div className={styles.wrap}>
        <div className={styles.left}>
          <FollowButton pageUid={pageUid} />

          <div className={styles.info}>
            <ProfileImage photoURL={userData?.photoURL as string} />

            <p className={styles.displayName}>{userData?.displayName}</p>
            {userData?.intro && (
              <p className={styles.intro}>{userData?.intro}</p>
            )}
          </div>

          <div className={styles.follow}>
            <p>
              <span>팔로워</span> <strong>00</strong>
            </p>
            <span></span>
            <p>
              <span>팔로잉</span> <strong>00</strong>
            </p>
          </div>
          {userData && <ActionButtons userData={userData} />}

          <div>
            <ProgressBar
              value={Number(userData?.total?.length) || 0}
              total={Number(userData?.goal) || 1}
            />

            {userData?.category && <Chart userData={userData} />}
          </div>
        </div>

        <MyBooks pageUid={pageUid} />
      </div>
    </div>
  );
}
