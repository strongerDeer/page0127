/** 도서 등록 폼에서 한 번에 적어 온 문장 — 한 번에 받는 개수의 상한 */
export const QUOTE_DRAFTS_MAX = 20;

/** 입력 중인 문장 한 줄 — 쪽수는 입력칸 그대로 문자열 */
export type QuoteDraftInput = { text: string; page: string };
