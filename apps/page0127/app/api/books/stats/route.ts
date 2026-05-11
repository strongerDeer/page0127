import { getBookStats } from '@/entities/book/server';

import { getCurrentUser } from '../../_helpers/auth';
import {
  internalErrorResponse,
  successResponse,
} from '../../_helpers/response';

/**
 * 독서 통계 조회 API
 *
 * 학습 포인트:
 * - GET /api/books/stats
 * - 공통 헬퍼로 중복 코드 제거
 * - 깔끔한 에러 처리
 *
 * @returns BookStats 객체
 */
export async function GET() {
  try {
    // 인증 확인 (헬퍼 사용)
    const { user, error } = await getCurrentUser();
    if (error) return error;

    // 통계 데이터 조회
    const stats = await getBookStats(user!.id);

    return successResponse(stats);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
