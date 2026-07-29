/**
 * Vite 의 `?raw` 접미사 import 타입.
 * Foundation 스토리가 토큰 CSS 를 문자열로 읽어 그 자리에서 파싱하는 데 쓴다
 * (값을 손으로 옮겨 적으면 토큰이 바뀔 때 문서만 조용히 낡는다).
 *
 * `.storybook/` 안에 두면 안 된다 — TypeScript 의 `**\/*` glob 은 점으로 시작하는
 * 디렉터리를 건너뛰므로 tsconfig 의 include 에 걸리지 않는다(실제로 그렇게 만들었다가
 * `tsc` 가 모듈을 못 찾았다). 쓰는 곳 옆에 둔다.
 */
declare module '*.css?raw' {
  const content: string;
  export default content;
}
