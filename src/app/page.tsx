'use client';
import { useEffect, useState } from 'react';

import { InputBookInterface } from './form/page';
import { getBooks } from '@remote/book';

import BookItem from '@components/BookItem';

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
      2024년 {books?.length}권
      <ul className="grid grid-cols-4 gap-16">
        {books?.map((item: InputBookInterface, index) => (
          <li key={index}>
            ₩
            <BookItem item={item} index={index} />
          </li>
        ))}
      </ul>
    </main>
  );
}
