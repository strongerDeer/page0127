import { DEFAULT_GOAL } from '@constants';

import styles from './GoalTitle.module.scss';
import { useMemo } from 'react';

export default function GoalTitle({
  rest,
  totalBook,
  currentGoal,
  year = new Date().getFullYear().toString(),
}: {
  rest: number;
  totalBook: number;
  currentGoal: number;
  year: string;
}) {
  const message = useMemo(() => {
    if (rest > 0) return `🏃 ${year}년 목표까지 ${rest}권 남았어요!`;
    if (rest === 0) return `👏 ${year}년의 목표 권수를 달성했어요!`;

    const percentage = Math.round(
      (totalBook / (currentGoal || DEFAULT_GOAL)) * 100,
    );

    return `💪 ${year}년의 목표를 ${percentage}% 달성했어요!!`;
  }, [rest, totalBook, currentGoal, year]);

  return <h3 className={styles.title}>{message}</h3>;
}
