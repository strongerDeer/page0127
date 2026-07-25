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

  if (HANGUL.test(message)) return 'log';

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
