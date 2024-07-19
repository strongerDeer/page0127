import getLifeUsers from '@remote/lifeUsers';
import { useQuery } from 'react-query';

export default function useLifeUsers({ userIds }: { userIds: string[] }) {
  return useQuery(
    ['lifeUsers', JSON.stringify(userIds)],
    () => getLifeUsers(userIds),
    {
      enabled: userIds.length > 0,
    },
  );
}
