'use client';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { getBookInfo, getSearchBook } from '@connect/aladin/aladin';
import Image from 'next/image';
import { Book } from '@connect/book';
import { AladinBook } from '@connect/aladin';
import debounce from 'lodash.debounce';
import Input from './Input';
import Loading from '@components/Loading';
import { validateSpineflipUrl } from '@utils/validateImageUrl';
import styles from './SearchBook.module.scss';

export default function SearchBook({
  setBookData,
}: {
  setBookData: React.Dispatch<React.SetStateAction<Book>>;
}) {
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebounceKeyword] = useState('');
  const [showResults, setShowResults] = useState(false);

  const debouncedSearch = useMemo(
    () =>
      debounce((keyword) => {
        setDebounceKeyword(keyword);
        setShowResults(!!keyword);
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

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
      const finalSpineflipUrl = await validateSpineflipUrl(cover, isbn);

      const data = await getBookInfo(isbn);
      const subTitle = data?.[0]?.subInfo?.subTitle ?? null;
      const itemPage = data?.[0]?.subInfo?.itemPage ?? null;

      setBookData((prev) => ({
        ...prev,
        id: isbn,
        title: title.split('-')[0].trim(),
        subTitle: subTitle,
        frontCover: `${imgArr[0]}cover500${imgArr[1]}`,
        flipCover: finalSpineflipUrl,
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
      setShowResults(false);
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
        onFocus={() => setShowResults(!!debouncedKeyword)}
        placeholder="어떤 책을 읽었나요?"
        maxLength={50}
      />
      {showResults && (isLoading || books) && (
        <div className={styles.result}>
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
                      alt=""
                      loading="lazy"
                    />
                    <span className={styles.content}>
                      <span className={styles.title}>{book.title}</span>
                      <span className={styles.info}>
                        <span>{book.author}</span>
                        <span>{book.publisher}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {books && books.length === 0 && <>검색결과가 없습니다.</>}
        </div>
      )}
    </>
  );
}
