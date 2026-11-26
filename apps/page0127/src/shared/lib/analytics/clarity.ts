/**
 * Clarity 전역 함수(window.clarity)를 안전하게 부르는 얇은 래퍼.
 *
 * window.clarity 는 MicrosoftClarity 의 clarity-init 이 lazyOnload 로 심는다.
 * 그래서 컴포넌트 effect 가 먼저 돌면 아직 없을 수 있고, 운영자 기기·로컬에서는 끝까지 없다.
 * 없으면 조용히 넘어간다 — 분석 도구 때문에 화면이 깨질 일은 없어야 한다.
 */

/** 화면 녹화(Clarity)에서 이 계정을 어떻게 다룰지 — GET /api/auth/recording 응답 */
export type RecordingPolicy = {
  /** 운영자 계정(관리자·테스트 계정) — 이 기기를 녹화에서 뺀다 */
  excluded: boolean;
  /** 리뷰어용 체험 계정 — 녹화는 하되 demo 태그로 구분한다 */
  demo: boolean;
};

type ClarityFn = (method: string, ...args: unknown[]) => void;

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    clarity?: ClarityFn;
  }
}

/**
 * 이미 돌고 있는 녹화를 멈춘다.
 *
 * 'stop' 은 Clarity 공식 문서의 API 목록에는 없지만, 공개된 clarity-js 소스
 * (src/clarity.ts 의 stop — 모듈을 멈추고 다시 큐잉 상태로 되돌린다)에 있다.
 * 문서에 없는 API 라 언젠가 바뀔 수 있다. 그래도 실패하면 "다음 새로고침부터 빠짐"으로
 * 물러날 뿐이라 try 로 감싸 둔다.
 */
export const stopClarity = (): void => {
  try {
    window.clarity?.('stop');
  } catch {
    // 무시 — 다음 페이지 로드부터는 운영자 기기 표시 때문에 아예 붙지 않는다
  }
};

/** 녹화에 사용자 정의 태그를 단다 — Clarity 대시보드 필터에서 고를 수 있다 */
export const setClarityTag = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  // 스크립트가 아직 안 붙었으면 공식 설치 코드와 같은 모양의 큐를 먼저 만들어 둔다.
  // clarity-init 은 c[a]=c[a]||… 로 이 큐를 그대로 이어받고, 본 스크립트가 도착하면 처리한다.
  if (!window.clarity) {
    const queued = ((...args: unknown[]) => {
      (queued.q = queued.q ?? []).push(args);
    }) as ClarityFn & { q?: unknown[][] };
    window.clarity = queued;
  }
  try {
    window.clarity('set', key, value);
  } catch {
    // 무시
  }
};
