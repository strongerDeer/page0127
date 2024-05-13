'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

import { InputBookInterface } from './form/page';
import { getBooks } from '@remote/book';
import Share from '@components/Share';
import BookItem from '@components/BookItem';
import Chart from '@components/Chart';

export default function Home() {
  const [books, setBooks] = useState<InputBookInterface[] | null>(null);

  useEffect(() => {
    const bookData = async () => {
      const data = await getBooks();
      if (data) {
        setBooks(data);
      }
    };
    bookData();
  }, []);

  return (
    <main>
      <Chart />
      <Share />
      2024년 {books?.length}권
      <ul className="grid grid-cols-4 gap-16">
        {books?.map((item: InputBookInterface, index) => (
          <li key={item.id}>
            <BookItem item={item} index={index} />
          </li>
        ))}
      </ul>
    </main>
  );
}
