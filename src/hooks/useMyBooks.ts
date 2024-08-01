import { useQuery } from 'react-query';

import { getMyBooks } from '@remote/mybook';

export default function useMyBooks({ userId }: { userId: string }) {
  return useQuery(['myBooks'], () => getMyBooks(userId), {
    enabled: userId !== '',
  });
}
