'use client';
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import Input from '@components/form/Input';
import Button from '@components/shared/Button';
import { useQuery } from 'react-query';
import BookList from '@components/book/BookList';
import { getSearchBooks } from '@remote/book';

export default function Page() {
  const [keyword, setKeyword] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery(['books', keyword], () => getSearchBooks(keyword), {
    enabled: !!keyword,
  });
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  const handleKeyword = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  }, []);

  return (
    <div>
      <Input
        label="책 검색"
        hiddenLabel
        ref={inputRef}
        value={keyword}
        onChange={handleKeyword}
      />
      {keyword !== '' && data?.length === 0 ? (
        <>찾으시는 데이터가 없습니다.</>
      ) : (
        <>{data && <BookList data={data} />}</>
      )}
    </div>
  );
}
