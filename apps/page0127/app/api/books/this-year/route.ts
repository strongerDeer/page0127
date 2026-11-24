import { getCurrentLibraryYear } from '@/entities/book';

import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import {
  internalErrorResponse,
  successResponse,
} from '../../_helpers/response';

import type { ThisYearRecord } from '@/features/story-my-record/model/types';

/**
 * 올해 내 완독 수와 목표 — GET /api/books/this-year
 *
 * 블로그 글의 "내 기록" 블록(```chart type: my-record)이 브라우저에서 부른다.
 * 글 페이지는 모두에게 같은 HTML 을 주는 정적 페이지(ISR)라, 사람마다 다른 숫자는
 * 서버에서 그리지 않고 이 API 로 따로 받는다(로그인을 서버에서 읽으면 ISR 이 깨진다).
 *
 * 왜 /api/books/stats 를 쓰지 않나: 그건 내 책을 전부(select *) 받아 월별·분야별까지 계산한다.
 * 여기서는 숫자 두 개면 되므로 DB 가 세게(count) 하고 행은 받지 않는다.
 *
 * 완독 연도 규칙은 서재와 같다(getCompletedYear): 완독 날짜가 있으면 그 연도, 없으면 완독 연도 칸.
 * 두 칸은 DB CHECK 로 함께 찰 수 없어서 OR 로 세도 한 권이 두 번 세지지 않는다.
 */
export async function GET() {
  try {
    const { user, error } = await getCurrentUser();
    if (error) return error;

    const supabase = await getSupabaseClient();
    const year = getCurrentLibraryYear();

    // 두 쿼리는 서로 기다릴 필요가 없다 — 동시에 보내 왕복 한 번 시간으로 끝낸다
    const [completedResult, goalResult] = await Promise.all([
      supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .or(
          `and(completed_date.gte.${year}-01-01,completed_date.lte.${year}-12-31),completed_year.eq.${year}`
        ),
      supabase
        .from('reading_goals')
        .select('target')
        .eq('user_id', user!.id)
        .eq('year', year)
        .maybeSingle(),
    ]);

    if (completedResult.error) throw completedResult.error;
    if (goalResult.error) throw goalResult.error;

    const body: ThisYearRecord = {
      year,
      completed: completedResult.count ?? 0,
      goal: (goalResult.data?.target as number | undefined) ?? null,
    };
    return successResponse(body);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
