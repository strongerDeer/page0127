import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';

import { userKeys } from '../model/queryKeys';

type CurrentUser = { id: string; email: string };

export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: userKeys.me(),
    queryFn: async (): Promise<CurrentUser | null> => {
      const { data } = await apiClient.get<
        CurrentUser | { data: CurrentUser | null } | null
      >('/auth/me');
      // Only a successful anonymous response may replace a cached logged-in user.
      // Let network/503 errors reject: React Query retains the last verified data.
      if (data === null) return null;
      return 'data' in data ? data.data : data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
    retryDelay: 1000,
    // iOS suspends background PWAs; recheck even when the last result is "fresh".
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    throwOnError: false,
  });
