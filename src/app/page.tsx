'use client';
import { useState } from 'react';
import { searchBook } from '../utils/searchBook';
import Image from 'next/image';

interface bookInfo {
  isbn: string;
  cover: string;
  title: string;
}
export default function Home() {
  const [books, setBooks] = useState({ total: 0, item: [] });

  const handleSearch = async () => {
    const data = await searchBook('어린왕자');

    setBooks({
      total: data.totalResults,
      item: data.item,
    });
  };

  return (
    <main>
      <ul>
        {books.item.map((item: bookInfo) => (
          <li key={item.isbn}>
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
            />
            {item.title}
          </li>
        ))}
      </ul>
      안녕하세요😀😀 <button onClick={handleSearch}>Search</button>
    </main>
  );
}
