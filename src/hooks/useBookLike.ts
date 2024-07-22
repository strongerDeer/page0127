import getBookLikes from '@remote/bookLike';
import { useQuery } from 'react-query';
import useUser from './auth/useUser';

export default function useBookLike() {
  const user = useUser();
  const { data } = useQuery(
    ['book-likes'],
    () => getBookLikes({ userId: user?.uid as string }),
    {
      enabled: user !== null,
    },
  );
  return { data };
}
