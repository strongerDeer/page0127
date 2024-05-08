'use client';

import { BookInterface } from '@models/BookInterface';
import { searchBook } from '@utils/searchBook';
import Image from 'next/image';
import { ChangeEvent, useEffect, useState } from 'react';

export default function FormPage() {
  const [isLoding, setIsLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [books, setBooks] = useState({ total: 0, item: [] });

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const newKeyword = e.target.value;
    setKeyword(newKeyword);
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (keyword !== '') {
        setIsLoading(true);
        const data = await searchBook(keyword);
        setBooks({ total: data.totalResults, item: data.item });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setBooks({ total: 0, item: [] });
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
    };
  }, [keyword]);

  return (
    <>
      <h2>도서입력</h2>
      <label htmlFor="search">도서검색</label>
      <input type="search" value={keyword} onChange={handleChange} />

      {isLoding ? (
        <>Loading....</>
      ) : (
        <>
          {books.total > 0 ? (
            <>
              <h3>{keyword} 검색결과</h3>
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
            keyword && <>데이터 없음</>
          )}
        </>
      )}
    </>
  );
}
