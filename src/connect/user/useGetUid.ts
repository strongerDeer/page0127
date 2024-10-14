import { useQuery } from 'react-query';

import { getUserByUserId } from './user';

export default function useGetUid(userId: string) {
  return useQuery([userId, userId], () => getUserByUserId(userId), {
    enabled: !!userId,
  });
}
