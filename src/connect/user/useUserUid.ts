import { useQuery } from 'react-query';

import { getUid } from './user';

export default function useUserUid(showId: string) {
  return useQuery(['show', showId], () => getUid(showId), {
    enabled: !!showId,
  });
}
