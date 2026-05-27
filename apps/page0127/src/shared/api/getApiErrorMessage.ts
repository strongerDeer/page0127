import { isAxiosError } from 'axios';

/**
 * API 에러에서 사용자에게 보여줄 메시지를 추출한다.
 *
 * 학습 포인트:
 * - 모든 요청을 apiClient(axios)로 통일했으므로 에러는 대부분 AxiosError
 * - 서버가 내려준 메시지(error.response.data.error)를 최우선으로 사용
 * - axios 외 일반 Error / 알 수 없는 값도 안전하게 처리 (fallback)
 *
 * @param error   catch 또는 mutation onError가 받은 unknown 에러
 * @param fallback 메시지를 추출하지 못했을 때 보여줄 기본 문구
 */
export const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (isAxiosError(error)) {
    return error.response?.data?.error ?? error.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};
