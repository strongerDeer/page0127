import Button from '@components/shared/Button';
import React, { useState } from 'react';

export default function CategoryTab({
  value,
  setValue,
}: {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  const categories = [
    'All',
    '컴퓨터모바일',
    '소설시희곡',
    '에세이',
    '경제경영',
    '인문학',
    '자기계발',
  ];
  return (
    <div>
      {categories.map((category) => (
        <Button
          key={category}
          variant={value === category ? 'solid' : 'outline'}
          size="sm"
          onClick={() => {
            setValue(category);
          }}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
