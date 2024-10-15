'use client';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import Input from '@components/form/Input';
import { useQuery } from 'react-query';
import BookList from '@components/book/BookList';

import useDebounce from '@hooks/useDebounce';
import { getSearchBooks } from '@connect/book/books';

export default function Page() {
  const [keyword, setKeyword] = useState<string>('');
  const debouncedKeyword = useDebounce(keyword);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery(
    ['books', debouncedKeyword],
    () => getSearchBooks(debouncedKeyword),
    {
      enabled: !!debouncedKeyword,
    },
  );

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div>
      <Input
        label="책 검색"
        hiddenLabel
        ref={inputRef}
        value={keyword}
        setValue={setKeyword}
      />
      {keyword !== '' && data?.length === 0 ? (
        <>찾으시는 데이터가 없습니다.</>
      ) : (
        <>{data && <BookList data={data} />}</>
      )}
    </div>
  );
}
