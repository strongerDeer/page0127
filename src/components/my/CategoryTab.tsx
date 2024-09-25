'use client';
import Button from '@components/shared/Button';
import { useState } from 'react';

export default function CategoryTab() {
  const [category, setCategory] = useState<string>('');

  console.log(category);
  const categories = [
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
          variant="outline"
          size="sm"
          onClick={() => {
            setCategory(category);
          }}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
