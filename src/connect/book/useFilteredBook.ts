import { useQuery } from 'react-query';
import { getFilterBooks } from './books';

export default function useFilteredBook({ like }: { like: string[] }) {
  return useQuery(['filteredBooks', like], () => getFilterBooks(like), {
    enabled: like?.length > 0,
  });
}
