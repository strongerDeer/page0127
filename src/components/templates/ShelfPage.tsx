'use client';
import ActionButtons from '@components/ActionButtons';
import MyBooks from '@components/MyBooks';
import Chart from '@components/my/Chart';
import ProgressBar from '@components/shared/ProgressBar';
import Background from '@components/shelf/Background';

import { useQuery } from 'react-query';

import styles from './ShelfPage.module.scss';
import FollowButton from '@components/follow/FollowButton';
import ProfileImage from '@components/shared/ProfileImage';
import { DEFAULT_GOAL } from '@constants';
import { getUser } from '@connect/user/user';
import useUserCount from '@connect/user/useUserCount';
import BarChart from '@components/my/BarChart';

export default function ShelfPage({ pageUid }: { pageUid: string }) {
  const { data: userData } = useQuery(['users'], () => getUser(pageUid));

  const year = String(new Date().getFullYear());
  const { data: counterData } = useUserCount(pageUid, year);

  return (
    <div>
      <Background />
      <div className={styles.wrap}>
        <div className={styles.left}>
          <FollowButton pageUid={pageUid} />

          <div className={styles.info}>
            <ProfileImage photoURL={userData?.photoURL as string} />

            <p className={styles.displayName}>{userData?.displayName}</p>
            {userData?.introduce && (
              <p className={styles.intro}>{userData?.introduce}</p>
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

            <FollowButton pageUid={pageUid} />
          </div>
          {userData && <ActionButtons userData={userData} />}

          <div>
            <ProgressBar
              value={Number(counterData?.books.length) || 0}
              total={Number(userData?.currentGoal) || DEFAULT_GOAL}
            />

            <BarChart
              title={`${userData?.displayName}의 ${year}년` || ''}
              userData={counterData?.month}
            />
            {counterData?.category && (
              <Chart
                title={`${userData?.displayName}의 ${year}년` || ''}
                userData={counterData?.category}
              />
            )}

            {/* <div>
              <p>가장 많이 읽은 카테고리: {userData?.total?.length}</p>
              <p>가장 두꺼운 책: {userData?.total?.length}</p>
              <p>가장 비싼 책: {userData?.total?.length}</p>
              <p>가장 좋아하는 작가: {userData?.total?.length}</p>
              <p>가장 좋아하는 출판사: {userData?.total?.length}</p>

              <p>총 읽은 책: {userData?.total?.length}</p>
              <p>총 읽은 쪽수: {userData?.total?.length}</p>
              <p>총 읽은 가격: {userData?.total?.length}</p>
            </div> */}
          </div>
        </div>

        <MyBooks pageUid={pageUid} />
      </div>
    </div>
  );
}
