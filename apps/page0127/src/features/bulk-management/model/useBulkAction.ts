'use client';

import { useRef, useState } from 'react';

import { isAxiosError } from 'axios';

import { apiClient } from '@/shared/api/client';

import type { BulkRequest, BulkResult } from './types';

/** Keep the caller's request ID on failure so a timed-out commit can be retried safely. */
export function useBulkAction(resource: 'books' | 'notifications') {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (request: BulkRequest): Promise<BulkResult | null> => {
    if (busy.current) return null;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const { data } = await apiClient.post<BulkResult>(
        `/${resource}/bulk`,
        request
      );
      return data;
    } catch (cause) {
      setError(
        isAxiosError<{ error: string }>(cause) && cause.response?.data.error
          ? cause.response.data.error
          : '처리 결과를 확인하지 못했어요. 같은 작업을 다시 시도해주세요.'
      );
      return null;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return { run, pending, error, clearError: () => setError(null) };
}
