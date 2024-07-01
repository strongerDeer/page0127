'use client';
import { useState } from 'react';
import Input from './Input';
import { getBookInfo, getSearchBook } from '@remote/aladin';
import { useQuery } from 'react-query';
import Image from 'next/image';
import {
  BookData,
  ImgDataProp,
} from '@components/templates/TemplateBookCreate';

interface AladinBook {
  title: string;
  link: string;
  author: string;
  pubDate: string;
  description: string;
  isbn: string;
  isbn13: string;
  itemId: number;
  priceSales: number;
  priceStandard: number;
  mallType: string;
  stockStatus: string;
  mileage: number;
  cover: string;
  categoryId: number;
  categoryName: string;
  publisher: string;
  salesPoint: number;
  adult: false;
  fixedPrice: true;
  customerReviewRank: number;
  subInfo: any;
}

interface SearchBookProps {
  setBookData: React.Dispatch<React.SetStateAction<BookData>>;
}

export default function SearchBook({ setBookData }: SearchBookProps) {
  const [keyword, setKeyword] = useState<string>('');

  const { data: books, isLoading } = useQuery(
    [keyword],
    () => getSearchBook(keyword),
    {
      enabled: keyword !== '',
    },
  );

  const inputImgData = async (book: AladinBook) => {
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
  };

  return (
    <>
      <Input
        label="책 검색"
        id="search"
        name="search"
        type="search"
        value={keyword}
        placeholder="어떤 책을 읽었나요?"
        setValue={setKeyword}
      />

      {isLoading ? (
        <>loading....</>
      ) : books ? (
        books.length > 0 ? (
          <ul>
            {books.map((book: AladinBook) => (
              <li key={book.isbn}>
                <button type="button" onClick={() => inputImgData(book)}>
                  <Image src={book.cover} width={80} height={80} alt="" />
                  {book.title} | {book.author} | {book.publisher}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>{keyword}에 대한 검색결과가 없습니다.</p>
        )
      ) : null}
    </>
  );
}
