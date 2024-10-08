import { UseQueryOptions, useQuery } from 'react-query';
import { ApplyClubValues } from '.';
import { getAppliedClub } from './club';

export default function useAppliedClub({
  userId,
  clubId,
  options,
}: {
  userId: string;
  clubId: string;
  options?: Pick<
    UseQueryOptions<ApplyClubValues | null>,
    'onSuccess' | 'onError' | 'suspense'
  >;
}) {
  return useQuery(
    ['applied', userId, clubId],
    () => getAppliedClub({ userId, clubId }),
    options,
  );
}
