import { AuthContext } from '@contexts/AuthContext';
import { useContext, useEffect, useState } from 'react';

import styles from './Goal.module.scss';

export default function Goal({ bookLength }: { bookLength: number }) {
  const { user } = useContext(AuthContext);

  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (user?.goals && bookLength) {
      const monthBook = Number((user.goals / 12).toFixed(1));
      const thisMonth = new Date().getMonth() + 1;
      const diff = Number((thisMonth * monthBook - bookLength).toFixed(1));

      let text = '';
      if (bookLength > user?.goals) {
        text = `목표를 달성했어요!\n목표보다 ${bookLength - user?.goals}권 더 읽었어요!`;
      } else if (bookLength === user?.goals) {
        text = `목표를 달성했어요! 좀 더 읽어볼까요?`;
      } else if (diff > 5) {
        text = `조금 더 달려볼까요? ${thisMonth}월 기준 ${diff}권 더 읽어야 목표 달성이 가능해요!`;
      } else if (diff <= 0) {
        text = `아주 잘하고 있어요! ${thisMonth}월 기준 ${Math.abs(diff)}권 넘게 읽고 있어요!`;
      } else {
        text = `힘내요! ${thisMonth}월 기준 ${diff}권 남았어요!`;
      }
      setText(text);
    }
  }, [user?.goals, bookLength]);

  return (
    <div className={styles.goal}>
      <div className={styles.content}>
        <h2>2024 목표권수</h2>
        <p style={{ whiteSpace: 'pre' }}>{text}</p>
      </div>
      {user?.goals && <ProgressBar read={bookLength} goal={user.goals} />}
    </div>
  );
}

const ProgressBar = ({ read, goal }: { read: number; goal: number }) => {
  return (
    <div className={styles.progressBar}>
      <div className={styles.progress}>
        <div
          className={styles.bar}
          style={{
            width: `${(read / goal) * 100}%`,
          }}
        ></div>
      </div>

      <div className={styles.text}>
        <strong>{read}</strong>/ {goal}
      </div>
    </div>
  );
};
