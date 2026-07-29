/**
 * Sentry 로 올리지 않을 "노이즈" 판별.
 *
 * captureConsoleIntegration 을 켜 두면 콘솔로 나가는 것이 그대로 이슈가 된다.
 * 그중에는 우리가 손댈 수 없고 장애도 아닌 것들이 섞인다. 이런 게 쌓이면
 * **진짜 오류가 목록에서 밀려나** 알림의 의미가 사라진다.
 *
 * 여기 넣는 기준: (1) 사용자에게 아무 영향이 없고, (2) 우리 코드로 고칠 수
 * 없으며, (3) 반복적으로 발생하는 것. 셋을 다 만족하지 않으면 넣지 않는다 —
 * 필터는 늘 "진짜 오류를 놓칠 위험"과 맞바꾸는 선택이다.
 */

const NOISE_PATTERNS: RegExp[] = [
  // Node 실험 기능 경고. next/og(satori)가 OG 이미지를 그릴 때 띄운다.
  // 오류가 아니라 경고이고, 런타임을 우리가 고를 수 없어 없앨 방법이 없다.
  /ExperimentalWarning/,
];

/** 이벤트에서 판별에 쓸 문자열을 뽑는다 (콘솔 캡처는 message, 예외는 exception에 담긴다) */
export const extractEventText = (event: {
  message?: string;
  exception?: { values?: { value?: string }[] };
}): string =>
  event.message ?? event.exception?.values?.[0]?.value ?? '';

export const isNoiseEvent = (text: string): boolean =>
  text.length > 0 && NOISE_PATTERNS.some((pattern) => pattern.test(text));
