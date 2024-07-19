import { getMyBook } from '@remote/mybook';
import { useQuery } from 'react-query';

export default function useMyBook({
  uid,
  bookId,
}: {
  uid: string;
  bookId: string;
}) {
  return useQuery(
    [`${uid}-${bookId}`, uid, bookId],
    () => getMyBook(uid, bookId),
    {
      enabled: uid !== '' && bookId !== '',
    },
  );
}
