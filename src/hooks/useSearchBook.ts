import { searchBook } from '@utils/searchBook';
import { useEffect, useState } from 'react';

export default function useSearchBook(query: string) {
  const [data, setData] = useState<null>(null);
  const [isLoding, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    searchBook(query)
      .then((res) => {
        if (!res.ok) {
          throw new Error('데이터를 불러오지 못했습니다.');
        }
        return res.json();
      })
      .then((data) => {
        setData(data);
      })
      .catch((e) => {
        console.log('에러발생', e);
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query]);

  return { data, isLoding, error };
}
