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
 */
export function errorResponse(message: string, status = 500) {
  console.error(`API Error (${status}):`, message);
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
  const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.';
  return errorResponse(message, 500);
}
