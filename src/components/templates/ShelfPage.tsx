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

  const rest =
    (userData?.currentGoal || DEFAULT_GOAL) -
    parseInt(counterData?.totalBook || 0);

  const Title = () => {
    let text = '';
    if (rest > 0) {
      text = `🏃 2024년 목표까지 ${rest}권 남았어요!`;
    } else if (rest === 0) {
      text = `👏 2024년의 목표 권수를 달성했어요!`;
    } else {
      const percentage = (
        (parseInt(counterData?.totalBook) /
          (userData?.currentGoal || DEFAULT_GOAL)) *
        100
      ).toFixed(0);

      text = `💪 2024년의 목표를 ${percentage}% 달성했어요!!`;
    }
    return <h3 className={styles.title}>{text}</h3>;
  };
  return (
    <div>
      {userData && <Background userId={userId} userData={userData} />}

      <div className="max-width">
        {userData && (
          <UserProfile userId={userId} uid={userData.uid} userData={userData} />
        )}

        <Title />
        <ProgressBar
          value={Number(counterData?.totalBook) || 0}
          total={Number(userData?.currentGoal) || DEFAULT_GOAL}
        />

        <div className={styles.flexContainer}>
          <section>
            <h3>월별</h3>
            <div>
              <BarChart
                title={`${userData?.displayName}의 ${year}년` || ''}
                userData={counterData?.date}
              />
            </div>
          </section>

          {counterData?.category && (
            <section>
              <h3>카테고리별</h3>
              <div>
                <Chart
                  title={`${userData?.displayName}의 ${year}년` || ''}
                  userData={counterData?.category}
                />
              </div>
            </section>
          )}
        </div>

        {userData && userData.uid && (
          <MyBooks uid={userData?.uid} userId={userId} />
        )}
      </div>
    </div>
  );
}
