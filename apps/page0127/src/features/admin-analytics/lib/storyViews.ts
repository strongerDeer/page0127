import { HUMAN_FILTER } from './ga4Reports';

import type { GaRow } from './ga4Reports';
import type { DateRange } from '@/shared/lib/admin/dateRange';

/**
 * 어드민 책 이야기 목록의 글별 조회수 — GA4 에서 /blog/{slug} 페이지만 골라 받는다.
 *
 * 유입분석 "많이 본 페이지"는 사이트 전체 상위 15개라 글이 순위 밖이면 안 보인다(HJ 2026-11-24).
 * 그래서 주소를 /blog/ 로 좁혀 따로 묻는다. 사람 추정(한국 접속)만 센다 — 유입분석과 같은 기준.
 */

export type StoryViews = { views: number; users: number };

const BLOG_PREFIX = '/blog/';

export const toStoryViewsRequest = (range: DateRange) => ({
  dateRanges: [{ startDate: range.from, endDate: range.to }],
  dimensions: [{ name: 'pagePath' }],
  metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
  dimensionFilter: {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: 'pagePath',
            stringFilter: { matchType: 'BEGINS_WITH', value: BLOG_PREFIX },
          },
        },
        HUMAN_FILTER,
      ],
    },
  },
  limit: 500,
});

/** "/blog/korea-reading-stats-2025/" → "korea-reading-stats-2025". 목록(/blog/)·더 깊은 주소는 null */
export const slugFromPath = (path: string): string | null => {
  if (!path.startsWith(BLOG_PREFIX)) return null;
  const rest = path.slice(BLOG_PREFIX.length).replace(/\/+$/, '');
  if (!rest || rest.includes('/')) return null;
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
};

/**
 * 같은 글이 끝 슬래시 유무로 두 줄이 될 수 있어 slug 로 합친다.
 * 사용자 수는 줄끼리 겹칠 수 있지만(같은 사람이 두 주소로) 그런 경우는 드물어 더한다.
 */
export const parseStoryViews = (rows: GaRow[]): Map<string, StoryViews> => {
  const bySlug = new Map<string, StoryViews>();
  for (const row of rows) {
    const slug = slugFromPath(row.dimensionValues?.[0]?.value ?? '');
    if (!slug) continue;
    const views = Number(row.metricValues?.[0]?.value ?? 0) || 0;
    const users = Number(row.metricValues?.[1]?.value ?? 0) || 0;
    const prev = bySlug.get(slug) ?? { views: 0, users: 0 };
    bySlug.set(slug, { views: prev.views + views, users: prev.users + users });
  }
  return bySlug;
};
