import { quotePostgrestValue } from '@/shared/lib/postgrestFilter';

import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/** Owner-only, paginated records: never merge rereads or return private memos. */
export async function GET(request: Request) {
  const { user, error: authError } = await getCurrentUser();
  if (authError) return authError;
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') ?? 0);
  const status = params.get('status') ?? 'all';
  const visibility = params.get('visibility') ?? 'all';
  const year = params.get('year') ?? '';
  const search = (params.get('search') ?? '').trim();
  if (
    !Number.isInteger(page) ||
    page < 0 ||
    page > 100000 ||
    !['all', 'reading', 'completed', 'want_to_read'].includes(status) ||
    !['all', 'public', 'private'].includes(visibility) ||
    (year && !/^[1-9]\d{3}$/.test(year)) ||
    search.length > 200
  )
    return errorResponse('검색 조건을 확인해주세요.', 400);
  const supabase = await getSupabaseClient();
  let query = supabase
    .from('books')
    .select(
      'id,title,author,status,is_public,read_count,created_at,completed_date,completed_year',
      { count: 'exact' }
    )
    .eq('user_id', user.id);
  if (status !== 'all') query = query.eq('status', status);
  if (visibility !== 'all')
    query = query.eq('is_public', visibility === 'public');
  if (year)
    query = query
      .gte('created_at', `${year}-01-01T00:00:00+09:00`)
      .lt('created_at', `${Number(year) + 1}-01-01T00:00:00+09:00`);
  if (search) {
    const pattern = quotePostgrestValue(`%${search}%`);
    query = query.or(`title.ilike.${pattern},author.ilike.${pattern}`);
  }
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range(page * 50, page * 50 + 49);
  if (error) return errorResponse('서재 기록을 불러오지 못했어요.');
  return successResponse({ records: data, total: count ?? 0 });
}
