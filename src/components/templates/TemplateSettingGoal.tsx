'use client';
import { updateGoal, updateUserGoal } from '@connect/goal/goal';
import useGoal from '@connect/goal/useGoal';
import useUser from '@connect/user/useUser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Goal {
  [key: number]: number;
}

import styles from './TemplateSign.module.scss';
import Input from '@components/form/Input';
import Button from '@components/shared/Button';

export default function TemplateSettingGoal() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const { data: goals } = useGoal();
  const initializeGoals = (): Goal => {
    const goals: Goal = {};
    for (let year = currentYear; year >= 2020; year--) {
      goals[year] = 0;
    }
    return goals;
  };

  const [goal, setGoal] = useState<Goal>(initializeGoals());

  useEffect(() => {
    if (goals) {
      setGoal((prev) => ({ ...prev, ...goals }));
    }
  }, [goals]);
  const user = useUser();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (user?.uid) {
      updateGoal({ userId: user?.uid, data: goal });
      if (goal[currentYear] !== 0) {
        updateUserGoal(user?.uid, goal[currentYear]);
      }
      router.push(`/shelf/${user?.showId}`);
    }
  };

  if (!goal) {
    return null;
  }

  return (
    <div className={styles.signContainer}>
      <h2>년도별 목표 권수 설정</h2>

      <form onSubmit={onSubmit} className={styles.form}>
        {Object.entries(goal)
          .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
          .map(([year, value]) => (
            <Input
              key={year}
              id={year}
              label={year}
              name={year}
              type="number"
              placeholder="목표를 설정하세요!"
              value={value === 0 ? '' : value}
              setValue={setGoal}
            />
          ))}
        <Button type="submit" full>
          수정
        </Button>
      </form>
    </div>
  );
}
