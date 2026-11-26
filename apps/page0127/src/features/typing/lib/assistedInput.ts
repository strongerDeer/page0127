// 브라우저(필사 창)에서 쓰는 순수 함수 — node:crypto 를 쓰는 recordCheck·guestToken 과 따로 둔다(클라이언트 번들에 섞이지 않게)

/**
 * 자동 입력 흔적 — 브라우저에서 입력 한 번마다 본다.
 * 사람이 치면 한 번에 1~2글자(한글 조합이 끝나며 다음 글자가 붙는 경우)만 늘어난다.
 * 스크립트가 만든 가짜 이벤트(isTrusted=false)나 한 번에 3글자 이상 들어오는 입력(자동 완성·매크로 붙여 넣기)은 표시한다.
 */
export const ASSISTED_CHUNK = 3;

export const isAssistedInput = ({
  trusted,
  composing,
  added,
}: {
  trusted: boolean;
  composing: boolean;
  /** 이번 입력으로 늘어난 글자 수 */
  added: number;
}): boolean => !trusted || (!composing && added >= ASSISTED_CHUNK);
