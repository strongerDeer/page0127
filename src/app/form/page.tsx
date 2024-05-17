'use client';

import { AuthContext } from '@contexts/AuthContext';
import { store } from '@firebase/firebaeApp';
import { BookInterface } from '@models/BookInterface';
import { getDataBook, searchBook } from '@utils/searchBook';
import { format } from 'date-fns';
import { addDoc, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export default function FormPage() {
  const { user, category } = useContext(AuthContext);
  const [isLoding, setIsLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [books, setBooks] = useState({ total: 0, item: [] });

  const today = format(new Date(), 'yyyy-MM-dd');

  const [readDate, setReadDate] = useState<string>(today);
  const [write, setWrite] = useState<string | null>(null);

  const [book, setBook] = useState<InputBookInterface | null>(null);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const newKeyword = e.target.value;
    setKeyword(newKeyword);
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (keyword !== '') {
        setIsLoading(true);
        const data = await searchBook(keyword);
        console.log(data);

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

    console.log(data);

    if (data) {
      const book = data.item[0];

      const bookData = {
        title: book.title,
        author: book.author,
        description: book.description,
        categoryName: book.categoryName,
        category: book.categoryName.split('>')[1],
        frontCover: img,
        frontCover: img,
        pubDate: book.pubDate,
        publisher: book.publisher,
      };
      setBook(bookData as InputBookInterface);
      setBooks({ total: 0, item: [] });
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user) {
      try {
        await addDoc(collection(store, 'books'), {
          ...book,
          readDate: readDate,
          write: write,
          createdAt: new Date()?.toLocaleDateString('ko', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          uid: user?.uid,
        });

        let increment = {
          total: category?.total || 0,
          novel: category?.novel || 0,
          computer: category?.computer || 0,
          essay: category?.essay || 0,
          improvement: category?.improvement || 0,
          humanity: category?.humanity || 0,
          economy: category?.economy || 0,
          other: category?.other || 0,
        };

        const bookdddd = [
          '소설/시/희곡',
          '컴퓨터/모바일',
          '에세이',
          '자기계발',
          '인문학',

          '경제경영',
        ];

        switch (book?.category) {
          case '소설/시/희곡':
            increment.total = increment.total + 1;
            increment.novel = increment.novel + 1;
            break;
          case '컴퓨터/모바일':
            increment.total = increment.total + 1;
            increment.computer = increment.computer + 1;
            break;
          case '에세이':
            increment.total = increment.total + 1;
            increment.essay = increment.essay + 1;
            break;
          case '자기계발':
            increment.total = increment.total + 1;
            increment.improvement = increment.improvement + 1;
            break;
          case '인문학':
            increment.total = increment.total + 1;
            increment.humanity = increment.humanity + 1;
            break;
          case '경제경영':
            increment.total = increment.total + 1;
            increment.economy = increment.economy + 1;
            break;
          default:
            increment.total = increment.total + 1;
            increment.other = increment.other + 1;
        }

        await setDoc(
          doc(store, `users/${user?.uid}/category/category`),
          increment,
        );
        toast.success('등록완료!');
      } catch (error) {
        console.log(error);
      } finally {
      }
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
              <label>완독 일</label>
              <input
                type="date"
                value={readDate}
                onChange={(e) => {
                  setReadDate(e.target.value);
                }}
              />
            </li>
            <li>
              <label>메모</label>
              <textarea
                onChange={(e) => {
                  setWrite(e.target.value);
                }}
              >
                {write}
              </textarea>
            </li>
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
