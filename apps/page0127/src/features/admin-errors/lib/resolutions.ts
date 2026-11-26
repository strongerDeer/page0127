/**
 * 해결한 오류 기록.
 *
 * /admin/errors 는 Sentry 의 "미해결" 이슈만 보여주므로, Resolve 하고 나면 무슨 일이
 * 있었는지 화면에서 사라진다. 원인과 해결을 여기 남겨 같은 일이 다시 생겼을 때 찾아본다.
 *
 * 해결 PR 에서 이 배열 맨 앞에 한 건을 추가한다 — 최신이 위로 온다.
 *
 * 고치지 않고 지켜보기로 한 오류도 여기 남긴다(status: 'watching').
 * 원인을 모르는 일회성 오류가 다시 생겼을 때 "전에도 있었나"를 찾기 위해서다.
 */
export type Resolution = {
  /**
   * 'resolved'(기본): 고쳐서 Resolve 함. 'watching': 원인 미상·영향 없음이라
   * 코드는 그대로 두고 지켜보는 중 — 화면에 "기록 · 지켜보는 중"으로 보인다.
   */
  status?: 'resolved' | 'watching';
  /** Sentry 이슈 ID (예: PAGE0127-1G). 같은 이슈가 다시 올라오면 이걸로 찾는다 */
  shortId: string;
  /** 오류 메시지 그대로 */
  title: string;
  /** 발생 위치 (Sentry culprit) */
  culprit: string;
  /** 해결한 날, watching 이면 기록한 날 (YYYY-MM-DD) */
  resolvedAt: string;
  /** 왜 발생했나 */
  cause: string;
  /** 어떻게 해결했나 (watching 이면 어떻게 대응하기로 했나) */
  fix: string;
  /** 해결 PR 번호 */
  prs: number[];
};

export const RESOLUTIONS: Resolution[] = [
  {
    status: 'watching',
    // Sentry 이슈 번호를 못 봐서 Vercel 요청 ID 로 남긴다
    shortId: 'wmpts-1795622539614-a8bc8f1714cb',
    title: 'Error: <!DOCTYPE html> (Cloudflare 1104 Script not found)',
    culprit: 'GET / — hero-slides unstable_cache 배경 갱신 (region iad1)',
    resolvedAt: '2026-11-26',
    cause:
      '01:02 KST, 홈 배너 캐시를 뒤에서 갱신하던 중 운영 Supabase 주소가 JSON 대신 Cloudflare 1104 에러 페이지(Ray a601e08a282e3079)를 돌려줬다. ' +
      'supabase-js 가 본문 HTML 을 error.message 에 담아 loadPublishedSlides 가 던졌고, Next 의 "revalidating cache" 로그가 Sentry 로 갔다. ' +
      '방문자는 낡은 캐시를 받아 영향 없음. 7일 중 1건. db-timeout(응답 없음)과 달리 Supabase 앞단이 즉시 에러 페이지로 답한 경우라 #463 재시도 대상도 아니다. Supabase 쪽 원인은 모름.',
    fix: '코드는 그대로 둔다. 같은 알림이 반복되면 배경 갱신 실패를 카톡 알림에서 빼는 안을 검토한다.',
    prs: [],
  },
  {
    shortId: 'PAGE0127-1G',
    title: 'NEXT_HTTP_ERROR_FALLBACK;404',
    culprit: 'Layout Server Component (/(admin)/admin)',
    resolvedAt: '2026-10-22',
    cause:
      '버그가 아닌 의도된 동작. admin 레이아웃은 관리자가 아니면(비로그인 포함) notFound() 로 404 를 내 admin 존재를 숨긴다. ' +
      'Sentry SDK 의 서버 컴포넌트 래퍼는 이 404 를 건너뛰지만 instrumentation.ts 의 onRequestError(captureRequestError)는 거르지 않아 이슈로 올라왔다. ' +
      '어드민 판정의 노이즈 패턴도 옛 이름(NEXT_NOT_FOUND)만 알고 있어 "지금 고치세요"로 분류됐다.',
    fix:
      'sentry.server/edge.config 의 beforeSend 에서 Next.js 제어 흐름 digest(notFound·redirect 등)를 걸러 Sentry 로 보내지 않는다. ' +
      '어드민 노이즈 패턴에 NEXT_HTTP_ERROR_FALLBACK 을 추가했다.',
    prs: [221],
  },
];
