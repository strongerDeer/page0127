import { useQuery, useQueryClient } from 'react-query';
import { getFilterBooks } from './getFilterBooks';

export default function useFilteredBook({ like }: { like: string[] }) {
  return useQuery(['filteredBooks', like], () => getFilterBooks(like), {
    enabled: like?.length > 0,
  });
}
