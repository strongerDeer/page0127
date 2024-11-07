import Button from '@components/shared/Button';
import React from 'react';

import styles from './CategoryTab.module.scss';
import clsx from 'clsx';
export default function CategoryTab({
  value,
  setValue,
}: {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  const categories = [
    'All',
    '컴퓨터/모바일',
    '소설/시/희곡',
    '에세이',
    '경제경영',
    '인문학',
    '자기계발',
    '기타',
  ];
  return (
    <div className={styles.tabWrap}>
      {categories.map((category, index) => (
        <button
          key={index}
          className={clsx(styles.tabBtn, value === category && styles.active)}
          onClick={() => {
            setValue(category);
          }}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
