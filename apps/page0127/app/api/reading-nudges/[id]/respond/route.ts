import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../_helpers/response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await getCurrentUser();
  if (authError) return authError;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ||
    !body ||
    !['save', 'accept', 'complete'].includes(body.action) ||
    typeof body.isPublic !== 'boolean' ||
    (body.completedDate != null &&
      (typeof body.completedDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(body.completedDate))) ||
    (body.startDate != null &&
      (typeof body.startDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate))) ||
    (body.completedYear != null && !Number.isInteger(body.completedYear)) ||
    (body.rating != null &&
      (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5))
  ) {
    return errorResponse('요청을 확인해 주세요.', 400);
  }
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('respond_reading_envelope', {
    p_notification_id: id,
    p_action: body.action,
    p_is_public: body.isPublic,
    p_completed_date: body.completedDate ?? null,
    p_completed_year: body.completedYear ?? null,
    p_rating: body.rating ?? null,
    p_start_date: body.startDate ?? null,
  });
  if (error) return errorResponse(error.message, 400);
  return successResponse(data);
}
