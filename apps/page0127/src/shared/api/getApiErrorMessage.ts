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
    // 타임아웃(ECONNABORTED)은 서버 응답 자체가 없는 에러라
    // error.message가 영어 원문("timeout of 60000ms exceeded")으로 남는다.
    // 서버가 준 메시지가 없을 때만 이 안내문으로 대체한다.
    if (error.code === 'ECONNABORTED' && !error.response) {
      return '응답이 지연되고 있어요. 잠시 후 다시 시도해주세요.';
    }
    return error.response?.data?.error ?? error.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};
