'use client';
import styles from './TemplateBookCreate.module.scss';

import Input from '@components/form/Input';
import Select from '@components/form/Select';
import Button from '@components/shared/Button';

import { Book } from '@connect/book';
import useUser from '@connect/user/useUser';
import { addBookInShelf, editBook, updateCountData } from '@remote/shelf';
import clsx from 'clsx';
import { format } from 'date-fns';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
export default function TemplateBookEdit({
  userId,
  bookId,
  data,
}: {
  userId: string;
  bookId: string;
  data: Book;
}) {
  const user = useUser();
  const router = useRouter();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [myData, setMyData] = useState<MyData>({
    readDate: data.readDate || today,
    memo: data.memo || '',
    grade: (data.grade as string) || '',
  });

  const handleGradeChange = (value: string) => {
    setMyData((prevData) => ({ ...prevData, grade: value }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      // 전체 책 추가

      editBook(userId, bookId, data, myData);

      // count 데이터 저장하기
      if (data.readDate !== myData.readDate || data.grade !== myData.grade) {
        updateCountData(bookId, userId, data, myData);
      }

      // 내 책장에 저장하기
      addBookInShelf(userId, bookId, { ...data, ...myData });
      toast.success('수정 되었습니다!');
      router.push(`/${user?.userId}`);
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error('책 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={clsx('max-width', styles.wrap)}>
      <h2 className="title1">책 수정</h2>

      <div className={styles.bookCreate}>
        <div className={styles.coverWrap}>
          <div className={styles.coverBox}>
            <Image
              src={data.frontCover}
              alt=""
              width={240}
              height={400}
              priority
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
        <form className={styles.form} onSubmit={onSubmit}>
          <Input
            label="제목"
            id="bookTitle"
            name="title"
            value={data.title}
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
            onChange={handleGradeChange}
            placeholder="이 책에 대한 점수는?"
            id="grade"
            name="grade"
            required
          />
          <Button type="submit">{isLoading ? '등록 중...' : '수정'}</Button>
        </form>
      </div>
    </div>
  );
}
