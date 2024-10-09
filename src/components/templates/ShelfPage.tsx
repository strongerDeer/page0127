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
import getUserCount, { getUid, getUser } from '@connect/user/user';

import BarChart from '@components/my/BarChart';

export default function ShelfPage({ pageId }: { pageId: string }) {
  const year = String(new Date().getFullYear());

  const { data: uid } = useQuery(['uid', pageId], () => getUid(pageId), {
    staleTime: Infinity, // uid는 잘 변경되지 않으므로 staleTime을 Infinity로 설정
  });
  const uidQuery = useQuery(['uid', pageId], () => getUid(pageId), {
    staleTime: Infinity, // uid는 잘 변경되지 않으므로 staleTime을 Infinity로 설정
  });

  const { data: userData } = useQuery(
    ['users', uid],
    () => getUser(uidQuery.data as string),
    {
      enabled: !!uid, // uid가 있을 때만 이 쿼리 실행
    },
  );

  const { data: counterData } = useQuery(
    ['userCount', uid, year],
    () => getUserCount(uidQuery.data as string, year),
    {
      enabled: !!uid, // uid가 있을 때만 이 쿼리 실행
    },
  );

  return (
    <div>
      <Background />
      <div className={styles.wrap}>
        <div className={styles.left}>
          {uid && <FollowButton pageUid={uid} />}

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
            {uid && <FollowButton pageUid={uid} />}
          </div>
          {userData && <ActionButtons userData={userData} />}

          <div>
            <ProgressBar
              value={Number(counterData?.books.length) || 0}
              total={Number(userData?.goal) || DEFAULT_GOAL}
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

        {uid && <MyBooks pageUid={uid} />}
      </div>
    </div>
  );
}
