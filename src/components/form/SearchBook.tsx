//

'use client';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import Input from './Input';
import { useQuery } from 'react-query';
import { getBookInfo, getSearchBook } from '@connect/aladin/aladin';
import Image from 'next/image';
import { Book } from '@connect/book';
import { debounce } from 'lodash';
import { AladinBook } from '@connect/aladin';
import Loading from '@components/Loading';

export default function SearchBook({
  setBookData,
}: {
  setBookData: React.Dispatch<React.SetStateAction<Book>>;
}) {
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebounceKeyword] = useState('');

  const debouncedSearch = useMemo(
    () => debounce((keyword) => setDebounceKeyword(keyword), 300),
    [],
  );

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setKeyword(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const {
    data: books,
    isLoading,
    isError,
    error,
  } = useQuery(
    ['search-books', debouncedKeyword],
    () => getSearchBook(debouncedKeyword),
    {
      enabled: !!debouncedKeyword,
    },
  );

  // 에러 메시지를 안전하게 추출하는 함수
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
  };

  const inputImgData = async (book: AladinBook) => {
    try {
      const {
        isbn,
        title,
        cover,
        author,
        publisher,
        pubDate,
        description,
        categoryName,
        priceStandard,
      } = book;

      const imgArr = cover.split('cover200');

      const data = await getBookInfo(isbn);
      const subTitle = data?.[0]?.subInfo?.subTitle ?? null;
      const itemPage = data?.[0]?.subInfo?.itemPage ?? null;

      setBookData((prev) => ({
        ...prev,
        id: isbn,
        title: title.split('-')[0].trim(),
        subTitle: subTitle,
        frontCover: `${imgArr[0]}cover500${imgArr[1]}`,
        flipCover: `${imgArr[0]}spineflip${imgArr[1].split('_')[0]}_d.jpg`,

        author: author.split('(지은이)')[0].trim(),
        publisher: publisher,
        pubDate: pubDate,
        description: description,

        categoryName: categoryName,

        category: categoryName.split('>')[1],

        page: itemPage,
        price: priceStandard ?? null,
      }));
      setKeyword('');
      setDebounceKeyword('');
    } catch (error) {
      console.error('Error updating book data:', error);
    }
  };

  return (
    <>
      <Input
        label="책 검색"
        id="search"
        name="search"
        type="search"
        value={keyword}
        onChange={handleSearchChange}
        placeholder="어떤 책을 읽었나요?"
        maxLength={50}
      />
      {isLoading && <Loading />}
      {isError && <div>오류: {getErrorMessage(error)}</div>}
      {books && books.length > 0 && (
        <ul>
          {books.map((book: AladinBook) => (
            <li key={book.isbn}>
              <button type="button" onClick={() => inputImgData(book)}>
                <Image
                  src={book.cover}
                  width={80}
                  height={80}
                  style={{ width: 'auto', height: 'auto' }}
                  alt=""
                />
                {book.title} | {book.author} | {book.publisher}
              </button>
            </li>
          ))}
        </ul>
      )}
      {books && books.length === 0 && <>검색결과가 없습니다.</>}
    </>
  );
}
