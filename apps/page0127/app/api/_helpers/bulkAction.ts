import { revalidatePath } from 'next/cache';

import { MAX_BULK_SELECTION } from '@/features/bulk-management/model/types';

import { getCurrentUser, getSupabaseClient } from './auth';
import { errorResponse, successResponse } from './response';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseBulkRequest(
  value: unknown,
  resource: 'books' | 'notifications'
) {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  const actions =
    resource === 'books'
      ? ['public', 'private', 'delete']
      : ['delete_selected', 'delete_read'];
  if (
    typeof body.requestId !== 'string' ||
    !uuid.test(body.requestId) ||
    typeof body.action !== 'string' ||
    !actions.includes(body.action)
  )
    return null;
  if (
    !Array.isArray(body.ids) ||
    body.ids.length > MAX_BULK_SELECTION ||
    body.ids.some((id) => typeof id !== 'string' || !uuid.test(id))
  )
    return null;
  const ids = [...new Set(body.ids as string[])];
  if (body.action === 'delete_read') {
    if (
      ids.length ||
      typeof body.before !== 'string' ||
      !Number.isFinite(Date.parse(body.before))
    )
      return null;
  } else if (!ids.length || body.before !== undefined) return null;
  return {
    requestId: body.requestId,
    action: body.action,
    ids,
    before: body.action === 'delete_read' ? (body.before as string) : null,
  };
}

export async function handleBulkAction(
  request: Request,
  resource: 'books' | 'notifications'
) {
  const { user, error: authError } = await getCurrentUser();
  if (authError) return authError;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse('요청 형식이 올바르지 않습니다.', 400);
  }
  const body = parseBulkRequest(raw, resource);
  if (!body)
    return errorResponse(
      '작업과 선택 항목을 확인해주세요. 한 번에 최대 500개까지 가능합니다.',
      400
    );
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('perform_bulk_action', {
    p_request_id: body.requestId,
    p_resource: resource,
    p_action: body.action,
    p_ids: body.ids,
    p_before: body.before,
  });
  if (error) {
    if (error.code === '42501')
      return errorResponse(
        '선택 항목이 없거나 변경 권한이 없습니다. 목록을 새로고침해주세요.',
        403
      );
    if (error.code === '22023')
      return errorResponse('요청 범위를 다시 확인해주세요.', 400);
    console.error('일괄 작업 실패:', error.code);
    return errorResponse(
      '일괄 작업을 완료하지 못했어요. 잠시 후 다시 시도해주세요.'
    );
  }
  if (resource === 'books') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.username) revalidatePath(`/${profile.username}`, 'layout');
    revalidatePath('/feed');
    revalidatePath('/books/all');
  }
  return successResponse(data);
}
