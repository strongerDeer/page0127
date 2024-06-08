'use client';
import styles from './TemplateBookCreate.module.scss';

import Input from '@components/form/Input';
import SearchBook from '@components/form/SearchBook';
import Select from '@components/form/Select';
import Button from '@components/shared/Button';
import Image from 'next/image';
import { useState } from 'react';

const options = [
  { value: 10, text: '10점: 인생책 등극!' },
  { value: 5, text: '5점: 추천' },
  { value: 4, text: '4점: 오 꽤괜' },
  { value: 3, text: '3점: 나쁘지 않았다!' },
  { value: 2, text: '2점: 음...내 취향은 아닌걸로!' },
  { value: 1, text: '1점: 꾸역꾸역' },
  { value: 0, text: '0점: 할많하안' },
];

export interface ImgDataProp {
  frontCover: string;
  flipCover: string;
}

export default function TemplateBookCreate() {
  const [bookData, setBookData] = useState<any>({
    title: '',
    frontCover: '',
    flipCover: '',
    readDate: '',
    memo: '',
    grade: null,

    author: '',
    publisher: '',
    pubDate: '',
    description: '',
    isbn: null,
    categoryName: '',
  });

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
        <form className={styles.form}>
          <Input label="제목" id="bookTitle" value={bookData.title} readOnly />
          <Input label="완독 날짜" id="readDate" type="date" />
          <Input label="메모" id="memo" />
          <Select options={options} />
          <Button type="submit">책장 추가</Button>
        </form>
      </div>
    </div>
  );
}
