'use client';

import { BookInterface } from '@models/BookInterface';
import { searchBook } from '@utils/searchBook';
import Image from 'next/image';
import { ChangeEvent, useState } from 'react';

export default function FormPage() {
  const [books, setBooks] = useState({ total: 0, item: [] });

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const data = await searchBook(e.target.value);
    setBooks({
      total: data.totalResults,
      item: data.item,
    });
  };

  return (
    <>
      <h2>도서입력</h2>
      <label htmlFor="search">도서검색</label>
      <input type="search" onChange={onChange} />
      {books.total > 0 ? (
        <>
          {books.item.map((item: BookInterface) => (
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
        </>
      ) : (
        <>데이터 없음</>
      )}
    </>
  );
}
