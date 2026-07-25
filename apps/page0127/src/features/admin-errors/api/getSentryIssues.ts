import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { type SentryIssue, triage, type TriagedIssue } from '../lib/triage';

const ORG = 'stronger';
const PROJECT = 'page0127';
// Vercel 연동이 자동으로 붙이는 운영 환경 이름. 'production'으로 조회하면 0건이 나온다.
const ENVIRONMENT = 'vercel-production';

export type SentryFailure =
  | { kind: 'no-token' }
  | { kind: 'forbidden' }
  | { kind: 'error'; status?: number };

export type SentryIssuesResult =
  | { ok: true; issues: TriagedIssue[] }
  | { ok: false; failure: SentryFailure };

export const classifyFailure = (status: number): SentryFailure =>
  status === 401 || status === 403 ? { kind: 'forbidden' } : { kind: 'error', status };

/**
 * 운영 환경의 미해결 이슈를 가져와 등급을 매긴다.
 *
 * 실패해도 예외를 던지지 않는다. Sentry가 죽거나 토큰이 없어도 어드민의 다른
 * 메뉴는 멀쩡해야 하므로, 결과 타입으로 실패를 표현해 화면이 안내를 띄우게 한다.
 */
export async function getSentryIssues(now = new Date()): Promise<SentryIssuesResult> {
  await assertAdmin();

  const token = process.env.SENTRY_ISSUES_TOKEN;
  if (!token) return { ok: false, failure: { kind: 'no-token' } };

  const url = new URL(`https://sentry.io/api/0/projects/${ORG}/${PROJECT}/issues/`);
  url.searchParams.set('query', 'is:unresolved');
  // statsPeriod은 '', '24h', '14d'만 허용된다. 빈 값이 전체 기간이다.
  url.searchParams.set('statsPeriod', '');
  url.searchParams.set('environment', ENVIRONMENT);
  url.searchParams.set('limit', '100');

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // 어드민을 새로고침할 때마다 Sentry를 두드리면 요청 한도에 걸린다.
      next: { revalidate: 300 },
    });

    if (!res.ok) return { ok: false, failure: classifyFailure(res.status) };

    const raw = (await res.json()) as SentryIssue[];
    return { ok: true, issues: raw.map((i) => ({ ...i, grade: triage(i, now) })) };
  } catch {
    console.error('[admin] Sentry 이슈 조회 실패');
    return { ok: false, failure: { kind: 'error' } };
  }
}
