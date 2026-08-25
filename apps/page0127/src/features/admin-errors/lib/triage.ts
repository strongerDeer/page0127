// Sentry 이슈 목록 API 응답에서 판정에 쓰는 필드만 추린 타입.
// 실제 응답에는 필드가 훨씬 많지만, 쓰는 것만 선언해 결합을 줄인다.
export type SentryIssue = {
  id: string;
  shortId: string;
  title: string;
  culprit: string | null;
  level: string;
  // Sentry는 발생 횟수를 문자열로 준다("2"). 숫자로 쓸 땐 변환이 필요하다.
  count: string;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  metadata?: { type?: string; value?: string };
};

export type Grade = 'urgent' | 'watch' | 'quiet' | 'log' | 'noise';

export type TriagedIssue = SentryIssue & { grade: Grade };

// 사용자 체감 피해가 없거나 우리 코드 밖에서 나는 것들.
const NOISE_PATTERNS = [
  /ResizeObserver loop/i,
  /AbortError/i,
  /aborted a request/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /NEXT_REDIRECT/,
  /NEXT_NOT_FOUND/,
  /Non-Error promise rejection captured/i,
];

// 하이드레이션 불일치는 화면이 실제로 깨지는 버그다. 다른 노이즈 문구가
// 섞여 있더라도 절대 묻으면 안 되므로 먼저 걸러낸다.
const NEVER_NOISE = /Text content does not match/i;

// 이 프로젝트의 console.error 메시지는 대부분 한글이고(95곳 중 84곳),
// 런타임·라이브러리가 내는 진짜 크래시 메시지는 전부 영어다.
// 그래서 한글 포함 여부가 "우리가 남긴 로그"의 판별식이 된다.
const HANGUL = /[가-힣]/;

const DAY_MS = 24 * 60 * 60 * 1000;

// 크론이 도는 경로. **apps/page0127/vercel.json 의 crons 와 같아야 한다.**
// 크론을 추가·이동하면 여기도 고친다(안 고치면 조용히 로그성으로 묻힌다).
//
// 경로만 봐서는 크론인지 알 수 없다 — /api/notifications/cleanup 은 이름에
// cron 이 없지만 스케줄러가 부른다. 그래서 접두사 규칙 대신 목록을 둔다.
const CRON_PATHS = [
  '/api/cron/snapshot-rankings',
  '/api/notifications/cleanup',
  '/api/cron/cleanup-rate-limits',
];

/**
 * 크론이 실패한 이슈인가.
 *
 * 크론은 사람이 보고 있지 않을 때 돌고, 실패해도 화면에 아무 표시가 없다.
 * 2026-08-18~22 랭킹 스냅샷이 5일 연속 실패했지만 메시지가 한글이라 로그성으로
 * 묻혔고, 그동안 그 5일치 순위 데이터가 영구히 비었다. 되돌릴 수 없는 손실이라
 * "우리가 남긴 로그"로 내려보내지 않는다.
 */
const isCronFailure = (issue: SentryIssue) => {
  const culprit = issue.culprit ?? '';
  return CRON_PATHS.some((path) => culprit.includes(path));
};

const messageOf = (issue: SentryIssue) => issue.metadata?.value ?? issue.title;

/**
 * 이슈 하나에 등급을 매긴다. 위에서부터 순서대로 평가하고 처음 걸린 등급으로 확정한다.
 *
 * environment 필터(vercel-production)는 조회 URL에서 이미 처리되므로 여기서는 다루지 않는다.
 * 현재 시각을 인자로 받는 이유는 테스트에서 기준 시각을 고정하기 위해서다.
 */
export const triage = (issue: SentryIssue, now: Date): Grade => {
  const message = messageOf(issue);

  if (!NEVER_NOISE.test(message) && NOISE_PATTERNS.some((p) => p.test(message))) {
    return 'noise';
  }

  // 한글 규칙보다 크론이 우선한다 — 같은 크론 실패인데 메시지가 한글이냐
  // 영어냐로 등급이 갈리던 것을 막는다(실제로 랭킹 스냅샷만 묻혔다).
  if (!isCronFailure(issue) && HANGUL.test(message)) return 'log';

  const firstSeen = new Date(issue.firstSeen).getTime();
  const lastSeen = new Date(issue.lastSeen).getTime();
  const sinceLast = now.getTime() - lastSeen;

  // 일주일 넘게 조용하면 이미 고쳤을 가능성이 높다 → Resolve를 재촉한다.
  if (sinceLast > 7 * DAY_MS) return 'quiet';

  if (sinceLast <= DAY_MS) return 'urgent';
  if (lastSeen - firstSeen >= 3 * DAY_MS) return 'urgent';
  if (issue.level === 'fatal') return 'urgent';

  return 'watch';
};
