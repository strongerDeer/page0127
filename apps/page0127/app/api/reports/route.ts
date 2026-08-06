import { NextRequest } from 'next/server';

import {
  isReportReason,
  REASON_REQUIRING_DETAIL,
  REPORT_DETAIL_MAX_LENGTH,
} from '@/entities/report/model/reasons';

import { getCurrentUser, getSupabaseClient } from '../_helpers/auth';
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
} from '../_helpers/response';

/** Postgres 유니크 위반 — 같은 사람이 같은 댓글을 다시 신고한 경우 */
const UNIQUE_VIOLATION = '23505';
/** RLS 가 막은 경우 — 자기 댓글이거나 볼 수 없는 댓글이다 */
const RLS_VIOLATION = '42501';

/**
 * POST /api/reports
 * 댓글 신고 접수
 *
 * 권한 판단을 앱에서 하지 않는다. "볼 수 있는 남의 댓글만 신고할 수 있다"는
 * 규칙은 RLS(`Users can report visible comments`)가 갖고 있고, 여기서는
 * 그 거절을 사용자가 읽을 문장으로 옮기기만 한다.
 *
 * 앱에서 한 번 더 확인하면 규칙이 두 곳에 생겨 어긋난다 — 실제로 어긋나는
 * 쪽은 늘 앱이고, DB 는 조용히 통과시킨다.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return errorResponse('잘못된 요청입니다.', 400);
    }

    const { commentId, reason, detail } = body as {
      commentId?: unknown;
      reason?: unknown;
      detail?: unknown;
    };

    if (typeof commentId !== 'string' || !commentId) {
      return errorResponse('신고할 댓글을 찾을 수 없습니다.', 400);
    }
    if (!isReportReason(reason)) {
      return errorResponse('신고 사유를 골라 주세요.', 400);
    }

    const trimmedDetail =
      typeof detail === 'string' ? detail.trim().slice(0, REPORT_DETAIL_MAX_LENGTH) : '';

    // '기타'는 설명이 없으면 운영자가 판단할 근거가 없다
    if (reason === REASON_REQUIRING_DETAIL && !trimmedDetail) {
      return errorResponse('어떤 점이 문제인지 적어 주세요.', 400);
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      comment_id: commentId,
      reason,
      detail: trimmedDetail || null,
    });

    if (error) {
      // 이미 신고한 건은 실패가 아니다 — 사용자 입장에선 접수된 상태 그대로다
      if (error.code === UNIQUE_VIOLATION) {
        return successResponse({ alreadyReported: true }, 200);
      }
      if (error.code === RLS_VIOLATION) {
        return errorResponse('신고할 수 없는 댓글입니다.', 403);
      }
      throw error;
    }

    return successResponse({ alreadyReported: false }, 201);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
