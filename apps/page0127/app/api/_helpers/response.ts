import { NextResponse } from 'next/server';

/**
 * API 응답 헬퍼 함수
 *
 * 학습 포인트:
 * - 일관된 에러 응답 형식
 * - 성공 응답 간소화
 */

/**
 * 성공 응답
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 에러 응답
 *
 * 로그 레벨을 상태 코드로 가른다:
 * - 5xx → console.error. 서버가 잘못한 것이므로 Sentry 이슈로 올라와야 한다.
 * - 4xx → console.warn. 비로그인(401)·잘못된 입력(400)·없는 리소스(404)는
 *   서버 장애가 아니라 **정상적으로 거절한 요청**이다.
 *
 * 왜 나누는가: sentry.server.config.ts 의 captureConsoleIntegration 이
 * console.error 를 전부 이슈로 만든다. 예전에는 4xx도 error 로 찍어서,
 * 비로그인 방문자가 만드는 `GET /api/auth/me` 401 이 이틀 만에 52건 쌓였다.
 * 오픈하면 방문자 수만큼 늘어나 **진짜 장애가 그 사이에 묻힌다.**
 */
export function errorResponse(message: string, status = 500) {
  const log = status >= 500 ? console.error : console.warn;
  log(`API Error (${status}):`, message);
  return NextResponse.json({ error: message }, { status });
}

/**
 * 404 Not Found 응답
 */
export function notFoundResponse(resource = '리소스') {
  return errorResponse(`${resource}를 찾을 수 없습니다.`, 404);
}

/**
 * 401 Unauthorized 응답
 */
export function unauthorizedResponse() {
  return errorResponse('로그인이 필요합니다.', 401);
}

/**
 * 500 Internal Server Error 응답
 */
export function internalErrorResponse(error?: unknown) {
  const message =
    error instanceof Error ? error.message : '서버 오류가 발생했습니다.';
  return errorResponse(message, 500);
}
