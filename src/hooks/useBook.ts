import { useQuery } from 'react-query';
import { getBook } from '@remote/book';

export default function useBook({ id }: { id: string }) {
  return useQuery(['book', id], () => getBook(id), {
    enabled: id !== '',
  });
}
