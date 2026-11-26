import { isAxiosError } from 'axios';
import { toast } from 'sonner';

import {
  DEMO_READ_ONLY_CODE,
  DEMO_READ_ONLY_MESSAGE,
} from '@/shared/lib/demo/demoAccount';

import { getApiErrorMessage } from './getApiErrorMessage';

/**
 * 체험 계정 쓰기 거절을 화면에서 다루는 곳 — 판정·안내·일반 실패 문구 생략을 한데 모은다.
 *
 * 흐름:
 *   1. proxy 가 체험 계정의 /api 쓰기를 403 + code: DEMO_READ_ONLY 로 돌려보낸다
 *   2. apiClient 응답 인터셉터가 그 응답을 보고 notifyDemoReadOnly() 로 안내를 한 번 띄운다
 *   3. 각 화면은 실패 처리에서 isDemoReadOnlyError 면 자기 실패 문구를 띄우지 않는다
 *      ("체험 안내" 위에 "오류가 발생했습니다"가 겹치지 않게)
 *
 * 2 를 인터셉터에 둔 이유: 화면마다 분기를 넣으면 새 버튼을 만들 때 또 빠뜨린다.
 * 인터셉터는 apiClient 를 쓰는 모든 요청을 지나가니 안내는 빠지지 않는다.
 */

/** 같은 id 로 띄우면 sonner 가 새로 쌓지 않고 기존 토스트를 바꾼다 — 연달아 눌러도 한 장 */
export const DEMO_READ_ONLY_TOAST_ID = 'demo-read-only';

type DemoErrorBody = { code?: string } | undefined;

/**
 * DB 트리거(block_demo_writes)가 올리는 에러 message.
 * 브라우저에서 Supabase 로 바로 쓰는 곳(알림 설정 등)은 proxy 를 지나지 않아 이걸로 받는다.
 * (supabase/migrations/20261121000100_demo_account.sql)
 */
export const DEMO_READ_ONLY_DB_MESSAGE = 'demo_read_only';

/**
 * 이 에러가 "체험 계정이라 막힘" 인가.
 * - /api 요청: proxy 의 403 + code
 * - Supabase 직접 쓰기: PostgrestError.message === 'demo_read_only'
 */
export const isDemoReadOnlyError = (error: unknown): boolean => {
  if (isAxiosError<DemoErrorBody>(error)) {
    return (
      error.response?.status === 403 &&
      error.response.data?.code === DEMO_READ_ONLY_CODE
    );
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    error.message === DEMO_READ_ONLY_DB_MESSAGE
  );
};

/** 체험 안내 토스트 — 실패가 아니라 안내라 빨간 error 대신 기본 토스트 */
export const notifyDemoReadOnly = () => {
  toast(DEMO_READ_ONLY_MESSAGE, { id: DEMO_READ_ONLY_TOAST_ID });
};

/**
 * 쓰기 실패 토스트. 체험 계정 거절이면 인터셉터가 이미 안내했으니 아무것도 하지 않는다.
 * 그 밖에는 서버 문구(없으면 fallback)를 띄운다.
 */
export const toastApiError = (error: unknown, fallback: string) => {
  if (isDemoReadOnlyError(error)) return;
  toast.error(getApiErrorMessage(error, fallback));
};
