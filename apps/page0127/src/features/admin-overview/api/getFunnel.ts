import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';

import {
  computeFunnel,
  type FunnelBook,
  type FunnelSummary,
} from '../lib/funnel';
import { kstDateToUtcEnd, kstDateToUtcStart } from '../lib/period';
import { fetchAll } from './fetchAll';

import type { DateRange } from '@/shared/lib/admin/dateRange';

// .in() 은 URL 쿼리스트링에 id 를 늘어놓는다 — uuid 100개면 3.7KB 라 URL 한도 안에 든다
const ID_CHUNK = 100;

/**
 * 가입 퍼널. 기간 안 가입자(운영자 제외)의 책 기록을 모아 lib/funnel.ts 가 센다.
 * 책은 가입자 id 로만 거른다 — 기간 밖에 등록한 책도 "지금까지 했나"에 들어가야 한다.
 * 실패하면 null — "전환 0%"로 보이면 안 된다.
 */
export async function getFunnel(
  range: DateRange,
  now = new Date()
): Promise<FunnelSummary | null> {
  await assertAdmin();
  const supabase = createAdminClient();
  const adminIds = await getAdminUserIds();

  const profiles = await fetchAll<{ id: string; created_at: string }>(
    (from, to) => {
      let q = supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', kstDateToUtcStart(range.from))
        .lt('created_at', kstDateToUtcEnd(range.to));
      if (adminIds.length > 0) q = q.not('id', 'in', toInFilter(adminIds));
      return q.order('created_at').order('id').range(from, to);
    },
    'funnel-signups'
  );
  if (!profiles) return null;

  const ids = profiles.map((p) => p.id);
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK)
    chunks.push(ids.slice(i, i + ID_CHUNK));

  const bookChunks = await Promise.all(
    chunks.map((chunk) =>
      fetchAll<FunnelBook>(
        (from, to) =>
          supabase
            .from('books')
            .select('user_id, created_at, status, one_line_review')
            .in('user_id', chunk)
            .order('created_at')
            .order('id')
            .range(from, to),
        'funnel-books'
      )
    )
  );
  if (bookChunks.some((b) => b === null)) return null;

  return computeFunnel(
    profiles.map((p) => ({ id: p.id, createdAt: p.created_at })),
    bookChunks.flatMap((b) => b ?? []),
    now
  );
}
