'use client';
import { useContext, useEffect, useState } from 'react';

import Input from '@components/shared/Input';
import Image from 'next/image';
import { getDataBook, searchBook } from '@utils/searchBook';
import { BookInterface } from '@models/BookInterface';
import {
  arrayUnion,
  doc,
  setDoc,
  updateDoc,
  increment,
  getDoc,
  serverTimestamp,
  arrayRemove,
} from 'firebase/firestore';
import { store } from '@firebase/firebaeApp';
import { AuthContext } from '@contexts/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export interface InputBookInterface {
  id: string;
  title: string;
  author: string;
  description: string;
  categoryName: string;
  category: string;
  frontCover: string;
  flipCover: string;
  pubDate: string;
  publisher: string;
  readDate: string;
  page: number;
}

export interface BooksData {
  total: number;
  item: any[];
}
const today = format(new Date(), 'yyyy-MM-dd');

export default function CreatePage() {
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [isLoding, setIsLoading] = useState<boolean>(false);
  const [booksData, setBooksData] = useState<BooksData | null>(null);
  const [book, setBook] = useState<InputBookInterface | null>(null);

  const [memo, setMemo] = useState<string>('');
  const [readDate, setReadDate] = useState<string>(today);
  const [grade, setGrade] = useState<number>(0);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (title !== '') {
        setIsLoading(true);
        const data = await searchBook(title);

        setBooksData({ total: data.totalResults, item: data.item });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setBooksData(null);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [title]);

  const inputBookData = async (isbn: string, img: string) => {
    const data = await getDataBook(isbn);

    const imgArr = img.split('cover200');

    const frontCover = `${imgArr[0]}cover500${imgArr[1]}`;
    const flipCover = `${imgArr[0]}spineflip${imgArr[1].split('_')[0]}_d.jpg`;

    if (data) {
      const book = data.item[0];

      const bookData = {
        id: book.isbn,
        title: book.title,
        author: book.author,
        description: book.description,
        categoryName: book.categoryName,
        category: book.categoryName.split('>')[1],
        frontCover: frontCover,
        flipCover: flipCover,
        pubDate: book.pubDate,
        publisher: book.publisher,
        page: book.subInfo.itemPage,
      };
      setBook(bookData as InputBookInterface);
      setBooksData(null);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (user && book?.id) {
      try {
        // 책정보 저장하기
        const bookData = await getDoc(doc(store, 'books', book?.id));

        if (!bookData.exists()) {
          // 책 정보 없음
          await setDoc(doc(store, 'books', book?.id), {
            ...book,
            createdTime: serverTimestamp(),
            lastUpdatedTime: serverTimestamp(),
            readUser: arrayUnion(user?.uid),
            readUserCount: 1,
            grade10User:
              grade === 10 ? arrayUnion(user?.uid) : arrayRemove(user?.uid),
          }).then(async () => {
            await setDoc(doc(store, `books/${book?.id}/grade/${user?.uid}`), {
              grade: grade,
            });
          });
        } else {
          const hasUserId = bookData.data().readUser.includes(user.uid);

          if (hasUserId) {
            await updateDoc(doc(store, 'books', book?.id), {
              lastUpdatedTime: serverTimestamp(),
              readUser: arrayUnion(user?.uid),
              grade10User:
                grade === 10 ? arrayUnion(user?.uid) : arrayRemove(user?.uid),
            }).then(async () => {
              await setDoc(doc(store, `books/${book?.id}/grade/${user?.uid}`), {
                grade: grade,
              });
            });
          } else {
            await updateDoc(doc(store, 'books', book?.id), {
              lastUpdatedTime: serverTimestamp(),
              readUser: arrayUnion(user?.uid),
              readUserCount: increment(1),
              grade10User:
                grade === 10 ? arrayUnion(user?.uid) : arrayRemove(user?.uid),
            }).then(async () => {
              await setDoc(doc(store, `books/${book?.id}/grade/${user?.uid}`), {
                grade: grade,
              });
            });
          }
        }

        // 유저 카데고리 정보 저장
        await updateDoc(doc(store, `users/${user?.uid}`), {
          total: arrayUnion(book.id),
          [`${book.category.replaceAll('/', '')}`]: arrayUnion(book.id),
        });

        // 유저에 책장에 데이터 저장하기
        const getUserhasBook = await getDoc(
          doc(store, `users/${user?.uid}/book/${book.id}`),
        );

        if (!getUserhasBook.exists()) {
          await setDoc(doc(store, `users/${user?.uid}/book/${book.id}`), {
            ...book,
            createdTime: serverTimestamp(),
            lastUpdatedTime: serverTimestamp(),
            readDate: new Date(readDate),
            memo: memo,
            grade: grade,
          });
        } else {
          await updateDoc(doc(store, `users/${user?.uid}/book/${book.id}`), {
            lastUpdatedTime: serverTimestamp(),
            readDate: new Date(readDate),
            memo: memo,
            grade: grade,
          });
        }

        toast.success('등록완료!');
      } catch (error: any) {
        console.log(error);
      } finally {
      }
    }
  };
  return (
    <form className="flex flex-col gap-4 items-center" onSubmit={onSubmit}>
      <Image src={book?.frontCover || ''} alt="" width={200} height={200} />
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
          {booksData !== null && booksData.total > 0 ? (
            <div className="w-full">
              <ul>
                {booksData.item.map((item: BookInterface) => (
                  <li key={item.isbn}>
                    <button
                      type="button"
                      className="flex gap-4 items-center p-1 w-full"
                      onClick={() => inputBookData(item.isbn, item.cover)}
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
            booksData !== null && <p>{title}에 대한 검색 결과가 없습니다</p>
          )}
        </>
      )}

      <Input
        label="완독 날짜"
        id="readDate"
        value={readDate}
        setValue={setReadDate}
        type="date"
        className="w-full"
      />

      <Input
        label="메모"
        id="memo"
        value={memo}
        setValue={setMemo}
        type="text"
        className="w-full"
      />

      <select onChange={(e) => setGrade(Number(e.target.value))}>
        <option>평점</option>
        <option value={10}>10점: 인생책 등극!</option>

        <option value={5}>5점: 추천</option>
        <option value={4}>4점: 오 꽤괜</option>
        <option value={3}>3점: 나쁘지 않았다!</option>
        <option value={2}>2점: 음...내 취향은 아닌걸로!</option>
        <option value={1}>1점: 꾸역꾸역</option>
        <option value={0}>0점: 할많하안</option>
      </select>

      <button
        type="submit"
        className="bg-blue-500 text-white rounded h-10 w-full"
      >
        생성
      </button>
    </form>
  );
}
