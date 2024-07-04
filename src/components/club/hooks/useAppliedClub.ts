import { ApplyClubValues } from '@models/applyClub';
import { getAppliedClub } from '@remote/applyClub';
import { UseQueryOptions, useQuery } from 'react-query';

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
