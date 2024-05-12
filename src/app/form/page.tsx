'use client';

import { AuthContext } from '@contexts/AuthContext';
import { store } from '@firebase/firebaeApp';
import { BookInterface } from '@models/BookInterface';
import { getDataBook, searchBook } from '@utils/searchBook';
import { addDoc, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export interface InputBookInterface {
  id: string;
  title: string;
  author: string;
  description: string;
  categoryName: string;
  category: string;
  cover: string;
  pubDate: string;
  publisher: string;
  readDate: string;
}

export default function FormPage() {
  const { user } = useContext(AuthContext);
  const [isLoding, setIsLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [books, setBooks] = useState({ total: 0, item: [] });

  const [book, setBook] = useState<InputBookInterface | null>(null);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const newKeyword = e.target.value;
    setKeyword(newKeyword);
  };

  console.log(user);

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

  const onClick = async (isbn: string, img: string) => {
    const data = await getDataBook(isbn);

    if (data) {
      const book = data.item[0];

      const bookData = {
        title: book.title,
        author: book.author,
        description: book.description,
        categoryName: book.categoryName,
        category: book.categoryName.split('>')[1],
        cover: img,
        pubDate: book.pubDate,
        publisher: book.publisher,
      };
      setBook(bookData as InputBookInterface);
      setBooks({ total: 0, item: [] });
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await addDoc(collection(store, 'books'), {
        ...book,
        createdAt: new Date()?.toLocaleDateString('ko', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        uid: user?.uid,
      });

      let cate = 'other';
      switch (book?.category) {
        case '소설/시/희곡':
          cate = 'novel';
          break;
        case '컴퓨터/모바일':
          cate = 'computer';
          break;
        case '에세이':
          cate = 'essay';
          break;
        case '자기계발':
          cate = 'improvement';
          break;
        case '인문학':
          cate = 'humanity';
          break;
      }

      await updateDoc(doc(store, `users/${user?.uid}`), {
        category: {
          ...user?.category,
        },
      });
      toast.success('등록완료!');
    } catch (error) {
      console.log(error);
    } finally {
    }
  };

  // 이미지는 searchdata 사용
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
                  <button
                    type="button"
                    onClick={() => onClick(item.isbn, item.cover)}
                  >
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
                  </button>
                </li>
              ))}
            </>
          ) : (
            keyword && <>데이터 없음</>
          )}
        </>
      )}
      {book && (
        <form onSubmit={onSubmit}>
          <Image src={book.cover} width={200} height={200} alt="" />
          <ul>
            <li>
              <label></label>
              <input type="text" value={book.title} readOnly />
            </li>
            <li>
              <input type="text" value={book.author} readOnly />
            </li>
            <li>
              <input type="text" value={book.category} readOnly />
            </li>
            <li>
              <input type="text" value={book.description} readOnly />
            </li>
            <li>
              <input type="text" value={book.pubDate} readOnly />
            </li>
            <li>
              <input type="text" value={book.publisher} readOnly />
            </li>
          </ul>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded flex justify-center items-center"
          >
            저장
          </button>
        </form>
      )}
    </>
  );
}
