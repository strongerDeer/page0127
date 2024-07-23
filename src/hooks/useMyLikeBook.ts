import { useQuery } from 'react-query';
import { getMyLikeBook } from '@remote/mylikebook';

export default function useMyLikeBook({ bookIds }: { bookIds: string[] }) {
  return useQuery(
    ['myLike', JSON.stringify(bookIds)],
    () => getMyLikeBook(bookIds),
    {
      enabled: bookIds?.length > 0,
    },
  );
}
