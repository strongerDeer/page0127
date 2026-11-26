'use client';

import { useRef, useState } from 'react';

import { isAxiosError } from 'axios';

import { apiClient } from '@/shared/api/client';
import { isDemoReadOnlyError } from '@/shared/api/demoReadOnly';

import type { BulkRequest, BulkResult } from './types';

/** Keep the caller's request ID on failure so a timed-out commit can be retried safely. */
export function useBulkAction(resource: 'books' | 'notifications') {
  const busy = useRef(false);
  // 마지막 실패가 체험 계정 거절이었나 — run() 이 null 만 돌려줘서 호출부가 따로 물어본다.
  // state 가 아니라 ref 인 이유: await 직후 같은 함수 안에서 바로 읽어야 해서(state 는 다음 렌더에 바뀐다)
  const demoBlocked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (request: BulkRequest): Promise<BulkResult | null> => {
    if (busy.current) return null;
    busy.current = true;
    setPending(true);
    setError(null);
    demoBlocked.current = false;
    try {
      const { data } = await apiClient.post<BulkResult>(
        `/${resource}/bulk`,
        request
      );
      return data;
    } catch (cause) {
      // 체험 안내는 인터셉터가 토스트로 띄웠다 — 확인 창에 같은 말을 또 적지 않는다
      if (isDemoReadOnlyError(cause)) {
        demoBlocked.current = true;
        return null;
      }
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
  return {
    run,
    pending,
    error,
    clearError: () => setError(null),
    wasDemoBlocked: () => demoBlocked.current,
  };
}
