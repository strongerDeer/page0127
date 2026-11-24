import { createAdminClient } from '@/shared/config/supabase/admin';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';

import type { AdminNavBadges } from '../model/adminNav';

/**
 * 메뉴 배지 숫자 — 사람이 손대야 하는 것만 센다(대시보드 "오늘 볼 것"과 같은 원칙).
 *
 * 어드민 레이아웃이 부른다. 레이아웃은 메뉴를 옮겨 다닐 때 다시 그려지지 않으니(partial rendering),
 * 숫자를 줄이는 서버 액션은 revalidatePath('/admin', 'layout') 으로 레이아웃까지 새로 그리게 한다.
 * head:true 개수 조회라 행을 안 가져와 가볍다. 하나가 실패해도 그 배지만 빠진다.
 */
export const getAdminNavBadges = async (): Promise<AdminNavBadges> => {
  const supabase = createAdminClient();

  const [reports, books, members] = await Promise.all([
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // 도서 검수 화면의 기본 목록(직접 등록 + 대기)과 같은 조건
    supabase
      .from('global_books')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'manual')
      .eq('review_status', 'pending'),
    countNewMembers(supabase),
  ]);

  if (reports.error)
    console.error('[admin] 메뉴 배지: 신고 수 조회 실패', reports.error);
  if (books.error)
    console.error('[admin] 메뉴 배지: 검수 대기 수 조회 실패', books.error);

  return {
    reports: reports.error ? undefined : (reports.count ?? 0),
    books: books.error ? undefined : (books.count ?? 0),
    members,
  };
};

/**
 * 마지막으로 회원 관리를 연 뒤 가입한 사람 수(admin_seen_marks).
 * 운영자·체험·테스트 계정은 대시보드 지표와 같은 기준(getAdminUserIds)으로 뺀다.
 * 확인 기록이 없거나 조회 실패면 undefined — 배지를 안 그린다.
 */
const countNewMembers = async (
  supabase: ReturnType<typeof createAdminClient>
): Promise<number | undefined> => {
  const [mark, excluded] = await Promise.all([
    supabase
      .from('admin_seen_marks')
      .select('seen_at')
      .eq('key', 'members')
      .maybeSingle(),
    getAdminUserIds(),
  ]);
  if (mark.error || !mark.data) {
    if (mark.error)
      console.error('[admin] 메뉴 배지: 회원 확인 시각 조회 실패', mark.error);
    return undefined;
  }

  let query = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', mark.data.seen_at as string);
  if (excluded.length > 0) query = query.not('id', 'in', toInFilter(excluded));

  const { count, error } = await query;
  if (error) {
    console.error('[admin] 메뉴 배지: 새 회원 수 조회 실패', error);
    return undefined;
  }
  return count ?? 0;
};
