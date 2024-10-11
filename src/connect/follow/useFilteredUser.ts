import { useQuery } from 'react-query';
import { getFilteredUser } from './follow';

export default function useFilteredUser({ array }: { array: string[] }) {
  return useQuery(['filtered-users', array], () => getFilteredUser(array), {
    enabled: array?.length > 0,
  });
}
