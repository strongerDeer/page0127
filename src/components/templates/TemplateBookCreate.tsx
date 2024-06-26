'use client';
import styles from './TemplateBookCreate.module.scss';

import Input from '@components/form/Input';
import SearchBook from '@components/form/SearchBook';
import Select from '@components/form/Select';
import Button from '@components/shared/Button';
import useUser from '@hooks/auth/useUser';
import { addBook, addBookInShelf, addCategory } from '@remote/shelf';
import { format } from 'date-fns';

import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'react-toastify';

const options = [
  { value: 10, label: '10점: 인생책 등극!' },
  { value: 5, label: '5점: 추천' },
  { value: 4, label: '4점: 오 꽤괜' },
  { value: 3, label: '3점: 나쁘지 않았다!' },
  { value: 2, label: '2점: 음...내 취향은 아닌걸로!' },
  { value: 1, label: '1점: 꾸역꾸역' },
  { value: 0, label: '0점: 할많하안' },
];

export interface ImgDataProp {
  frontCover: string;
  flipCover: string;
}

export interface BookData {
  id: string | null;
  title: string;
  subTitle: string | null;
  frontCover: string;
  flipCover: string;
  author: string;
  publisher: string;
  pubDate: string;
  description: string;
  categoryName: string;
  category: string;
  page: number | null;
  price: number | null;
}

export interface MyData {
  readDate: string;
  memo: string;
  grade: string;
}
export default function TemplateBookCreate() {
  const user = useUser();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [bookData, setBookData] = useState<BookData>({
    id: null,
    title: '',
    subTitle: null,
    frontCover: '',
    flipCover: '',
    author: '',
    publisher: '',
    pubDate: '',
    description: '',
    categoryName: '',
    category: '',
    page: null,
    price: null,
  });
  const [myData, setMyData] = useState<MyData>({
    readDate: today,
    memo: '',
    grade: '',
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (user && bookData.id) {
      setIsLoading(true);
      try {
        // 전체 책 추가
        addBook(user.uid, bookData.id, bookData, myData);
        // 유저 카테고리 저장하기
        addCategory(user.uid, bookData.id, bookData.category);
        // 내 책장에 저장하기
        addBookInShelf(user.uid, bookData.id, { ...bookData, ...myData });

        toast.success('등록완료!');
      } catch (error) {
        console.error('Error saving book:', error);
        toast.error('책 등록 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  return (
    <div className="max-width">
      <h2 className="title1">책 등록</h2>

      <SearchBook setBookData={setBookData} />

      <div className={styles.bookCreate}>
        <div className={styles.coverWrap}>
          <div className={styles.coverBox}>
            {bookData.frontCover ? (
              <Image
                src={bookData.frontCover}
                alt=""
                width={400}
                height={400}
              />
            ) : (
              <>
                '책 제목'을 검색하여 입력하면
                <br /> 책 이미지가 등록됩니다!
              </>
            )}
          </div>
        </div>
        <form className={styles.form} onSubmit={onSubmit}>
          <Input
            label="제목"
            id="bookTitle"
            name="title"
            value={bookData.title}
            readOnly
          />
          <Input
            label="완독 날짜"
            id="readDate"
            name="readDate"
            type="date"
            value={myData.readDate}
            max={today}
            setValue={setMyData}
          />
          <Input
            label="메모"
            id="memo"
            name="memo"
            value={myData.memo}
            setValue={setMyData}
          />
          <Select
            label="점수"
            options={options}
            value={myData.grade}
            setValue={setMyData}
            placeholder="이 책에 대한 점수는?"
            id="grade"
            name="grade"
            required
          />
          <Button type="submit">
            {isLoading ? '등록 중...' : '책장 추가'}
          </Button>
        </form>
      </div>
    </div>
  );
}
