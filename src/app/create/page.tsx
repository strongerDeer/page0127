'use client';
import { useEffect, useState } from 'react';

import Input from '@components/Input';
import Image from 'next/image';
import { searchBook } from '@utils/searchBook';
import { BookInterface } from '@models/BookInterface';

export default function CreatePage() {
  const [title, setTitle] = useState('');
  const [isLoding, setIsLoading] = useState<boolean>(false);
  const [booksData, setBooksData] = useState({ total: 0, item: [] });

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (title !== '') {
        setIsLoading(true);
        const data = await searchBook(title);

        setBooksData({ total: data.totalResults, item: data.item });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setBooksData({ total: 0, item: [] });
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [title]);

  const inputBookData = () => {};
  return (
    <form className="flex flex-col gap-4 items-center">
      <Image src="/images/no-img.jpg" alt="" width={200} height={200} />
      <Input
        label="책 제목"
        id="bookTitle"
        type="search"
        className="w-full"
        value={title}
        setValue={setTitle}
      />

      {isLoding ? (
        <>Loading....</>
      ) : (
        <>
          {booksData.total > 0 ? (
            <div className="w-full">
              <ul>
                {booksData.item.map((item: BookInterface) => (
                  <li key={item.isbn}>
                    <button
                      type="button"
                      className="flex gap-4 items-center p-1 w-full"
                      onClick={inputBookData}
                    >
                      <Image
                        src={item.cover}
                        alt=""
                        width={100}
                        height={200}
                        className="w-auto h-auto max-w-16  max-h-22 object-cover border border-gray-200"
                      />
                      <span className="text-sm">
                        <span className="font-bold">{item.title}</span>
                        <span className="text-gray-700">
                          {' '}
                          | {item.publisher}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            title && <>데이터 없음</>
          )}
        </>
      )}

      <Input
        label="완독 날짜"
        id="readDate"
        value=""
        type="date"
        className="w-full"
      />

      <button
        type="button"
        className="bg-blue-500 text-white rounded h-10 w-full"
      >
        생성
      </button>
    </form>
  );
}
