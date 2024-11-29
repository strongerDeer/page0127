'use client';

import MyBooks from '@components/MyBooks';
import ProgressBar from '@components/shared/ProgressBar';
import Background from '@components/shelf/Background';

import styles from './ShelfPage.module.scss';
import { DEFAULT_GOAL } from '@constants';
import useUserCount from '@connect/user/useUserCount';
import BarChart from '@components/my/BarChart';
import UserProfile from '@components/shelf/UserProfile';
import { useState } from 'react';
import { User } from '@connect/user';
import GoalTitle from '@components/shelf/GoalTitle';
import RadarChart from '@components/my/RadarChart';

const nowYear = String(new Date().getFullYear());

export default function ShelfPage({ userData }: { userData: User }) {
  const [year, setYear] = useState(nowYear);
  const { userId, currentGoal, displayName } = userData;
  const { data: counterData } = useUserCount(userId, year);

  const rest =
    (currentGoal || DEFAULT_GOAL) - parseInt(counterData?.totalBook || 0);

  return (
    <div>
      {userData && <Background userData={userData} setYear={setYear} />}

      <div className="max-width">
        {userData && <UserProfile userId={userId} userData={userData} />}

        <GoalTitle
          rest={rest}
          totalBook={parseInt(counterData?.totalBook)}
          currentGoal={currentGoal}
          year={year}
        />

        <ProgressBar
          value={Number(counterData?.totalBook) || 0}
          total={Number(currentGoal) || DEFAULT_GOAL}
        />

        <div className={styles.flexContainer}>
          <section>
            <h3>월별</h3>
            <div>
              <BarChart
                title={`${displayName}의 ${year}년` || ''}
                userData={counterData?.date}
                year={year}
              />
            </div>
          </section>

          <section>
            <h3>카테고리별</h3>

            <RadarChart
              title={`${displayName}의 ${year}년` || ''}
              userData={counterData?.category || []}
            />
          </section>
        </div>

        <MyBooks userId={userId} year={year} />
      </div>
    </div>
  );
}
