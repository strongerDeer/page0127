'use client';
import ActionButtons from '@components/ActionButtons';
import MyBooks from '@components/MyBooks';
import Chart from '@components/my/Chart';
import ProgressBar from '@components/shared/ProgressBar';
import Background from '@components/shelf/Background';

import styles from './ShelfPage.module.scss';
import { DEFAULT_GOAL } from '@constants';
import useUserCount from '@connect/user/useUserCount';
import BarChart from '@components/my/BarChart';
import useGetUser from '@connect/user/useGetUser';
import UserProfile from '@components/shelf/UserProfile';

export default function ShelfPage({ userId }: { userId: string }) {
  const { data: userData } = useGetUser(userId);
  const year = String(new Date().getFullYear());
  const { data: counterData } = useUserCount(userData?.uid || '', year);

  return (
    <div>
      {userData && <Background userId={userId} userData={userData} />}

      {userData && (
        <UserProfile userId={userId} uid={userData.uid} userData={userData} />
      )}

      <div className={styles.wrap}>
        <div>
          <ProgressBar
            value={Number(userData?.totalBook) || 0}
            total={Number(userData?.currentGoal) || DEFAULT_GOAL}
          />

          <BarChart
            title={`${userData?.displayName}의 ${year}년` || ''}
            userData={counterData?.date}
          />
          {counterData?.category && (
            <Chart
              title={`${userData?.displayName}의 ${year}년` || ''}
              userData={counterData?.category}
            />
          )}
        </div>

        {userData && userData.uid && (
          <MyBooks uid={userData?.uid} userId={userId} />
        )}
      </div>
    </div>
  );
}
