'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

import { InputBookInterface } from './form/page';
import { getBooks } from '@remote/book';

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
      <ul>
        {books?.map((item: InputBookInterface, index) => (
          <li key={item.id}>
            <Image
              src={item.cover}
              alt=""
              width={200}
              height={400}
              style={{
                width: 'auto',
                height: 'auto',
                aspectRatio: '200/400',
                objectFit: 'cover',
              }}
              priority={index < 4 ? true : false}
            />
            <p> {item.title}</p>
            <p> {item.category}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
