import { getMyBook } from '@connect/mybook/mybook';
import { useQuery } from 'react-query';

export default function useMyBook({
  userId,
  bookId,
}: {
  userId: string;
  bookId: string;
}) {
  return useQuery(
    [`${userId}-${bookId}`, userId, bookId],
    () => getMyBook(userId, bookId),
    {
      enabled: userId !== '' && bookId !== '',
    },
  );
}
