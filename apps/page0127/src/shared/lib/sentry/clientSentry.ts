/**
 * 브라우저 Sentry 를 "화면이 뜬 뒤에" 켜는 로더 (2026-11-26)
 *
 * 왜 늦게 켜나:
 * - Next.js 는 instrumentation-client.ts 를 하이드레이션 "전에" 실행한다. 거기서
 *   Sentry 를 정적으로 import·init 하면 Sentry 코드(공통 청크의 약 37%, 160KB)를
 *   받고·읽고·초기화하는 시간이 그대로 첫 긴 작업이 됐다(폰 실측 첫 JS 작업의 48%).
 * - init 만 빼 본 실험에서 TBT 가 페이지마다 50~140ms 줄었다.
 *
 * 그래서 Sentry 는 import() 로 따로 떼어(별도 청크) load 뒤 한가할 때 받는다.
 * 그 사이에 난 오류는 아래 대기열에 모았다가 init 직후 보낸다.
 *
 * ⚠️ 이 파일 밖에서 '@sentry/nextjs' 를 클라이언트 코드에 정적으로 import 하면
 *    Sentry 가 다시 공통 청크로 들어온다. 클라이언트에서는 captureClientException 을 쓴다.
 */

import { isDemoReadOnlyRejection } from '@/shared/config/sentryDemoFilter';

type SentryModule = typeof import('./sentryBrowser');

/** load 뒤 이 시간 안에 한가한 틈이 없어도 켠다 (너무 늦으면 오류를 놓친다) */
const IDLE_TIMEOUT_MS = 3000;
/** init 전에 모아 둘 오류 최대 개수 — 오류가 폭주해도 메모리를 지킨다 */
const MAX_QUEUED_ERRORS = 20;

let sentryPromise: Promise<SentryModule> | null = null;
let loadedSentry: SentryModule | null = null;
const earlyErrors: unknown[] = [];

const initSentry = (Sentry: SentryModule) => {
  Sentry.init({
    // DSN은 브라우저에 공개되는 프로젝트 식별자지만, 환경별 분리와 교체를 위해
    // 코드에 고정하지 않고 Vercel 환경변수로 관리한다.
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    dataCollection: {
      // 독서 기록·이메일 같은 개인정보가 오류 이벤트에 실리지 않도록 최소 수집한다.
      userInfo: false,
      httpBodies: [],
    },

    // 사용자 체감 성능 흐름은 소량만 표본 수집한다. 오류 이벤트는 이 비율과
    // 무관하게 전송된다.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1,

    // 세션(Release Health) 보내기를 끈다. 켜 두면 페이지를 열 때마다 세션 봉투 1개를
    // /monitoring 터널로 보내는데, 터널은 우리 서버 함수라 페이지뷰마다 호출이 1번 늘었다
    // (2026-11-11 Vercel Fluid Active CPU 한도 초과 때 확인). 우리는 "크래시 없는 세션 비율"
    // 화면을 보지 않고 오류 이벤트만 쓴다. 오류 전송은 이 설정과 무관하게 그대로다.
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== 'BrowserSession'),

    // 체험 계정 쓰기 거절은 의도된 403 이라 이슈·알림으로 올리지 않는다(sentryDemoFilter 참고)
    beforeSend: (event, hint) =>
      isDemoReadOnlyRejection(hint.originalException) ? null : event,
  });
};

/** Sentry 를 (한 번만) 받아서 켠다. 여러 번 불러도 같은 Promise 를 돌려준다. */
export const loadSentry = (): Promise<SentryModule> => {
  sentryPromise ??= import('./sentryBrowser').then((Sentry) => {
    initSentry(Sentry);
    loadedSentry = Sentry;
    stopEarlyErrorQueue();
    // init 전에 모아 둔 오류를 보낸다. 직접 잡은 오류가 아니라 처리 안 된 오류였다고 표시한다
    // (Sentry 기본 전역 처리기가 잡았을 때와 같은 "unhandled" 로 보이게).
    for (const error of earlyErrors.splice(0)) {
      Sentry.captureException(error, {
        mechanism: { type: 'onerror', handled: false },
      });
    }
    return Sentry;
  });
  return sentryPromise;
};

/**
 * 클라이언트에서 오류를 Sentry 로 보낸다(error.tsx·global-error.tsx 용).
 * 아직 안 켜졌으면 지금 켜고 보낸다 — 에러 화면은 이미 사용자가 멈춘 상황이라 기다릴 이유가 없다.
 */
export const captureClientException = (error: unknown) => {
  loadSentry()
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {
      // Sentry 청크를 못 받아도(광고 차단기·오프라인) 화면은 그대로 둔다
    });
};

// --- init 전 오류 대기열 ---------------------------------------------------

const onEarlyError = (event: ErrorEvent) => {
  if (earlyErrors.length < MAX_QUEUED_ERRORS) {
    earlyErrors.push(event.error ?? event.message);
  }
};
const onEarlyRejection = (event: PromiseRejectionEvent) => {
  if (earlyErrors.length < MAX_QUEUED_ERRORS) {
    earlyErrors.push(event.reason);
  }
};

const startEarlyErrorQueue = () => {
  window.addEventListener('error', onEarlyError);
  window.addEventListener('unhandledrejection', onEarlyRejection);
};

function stopEarlyErrorQueue() {
  window.removeEventListener('error', onEarlyError);
  window.removeEventListener('unhandledrejection', onEarlyRejection);
}

/**
 * instrumentation-client.ts 에서 부른다.
 * 대기열을 바로 켜 두고, Sentry 는 load → 한가한 틈(최대 3초)에 받는다.
 */
export const scheduleSentryInit = () => {
  if (typeof window === 'undefined') return;

  startEarlyErrorQueue();

  const start = () => {
    const run = () => void loadSentry().catch(() => {});
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    } else {
      // 사파리는 requestIdleCallback 이 없다
      setTimeout(run, 1);
    }
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
};

/**
 * 페이지 이동 추적 훅 — Next 가 instrumentation-client 의 onRouterTransitionStart 로 부른다.
 * Sentry 가 켜지기 전 이동은 건너뛴다(성능 추적은 5% 표본이라 영향이 작다).
 */
export const onRouterTransitionStart = (
  ...args: Parameters<SentryModule['captureRouterTransitionStart']>
) => {
  loadedSentry?.captureRouterTransitionStart(...args);
};
