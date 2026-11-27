/**
 * AI 분석 진행 스트림의 "한 줄" 약속 — 서버(라우트)와 화면이 같이 쓴다
 *
 * 학습 포인트:
 * - 응답은 NDJSON(줄마다 JSON 하나, Content-Type: application/x-ndjson)
 * - SSE(text/event-stream)를 쓰지 않은 이유: 브라우저 EventSource 는 GET 만 돼서
 *   POST 본문(targetUserId 등)을 못 보낸다. fetch + ReadableStream 이면 POST 그대로 읽힌다
 * - 스트림이 열린 뒤엔 HTTP 상태가 이미 200 이다 → 실패는 { type: 'error' } 줄로 보낸다
 *
 * 이 파일은 클라이언트도 import 하니 서버 전용 모듈(SDK·Supabase)을 가져오지 않는다.
 */

/** 분석이 지금 어느 단계인가 — 화면 문구와 전체 진행률 구간이 이것으로 정해진다 */
export type AnalysisStage =
  | 'analyzing' // AI 가 답을 쓰는 중 (ratio 로 세부 진행률)
  | 'saving' // 답을 검증하고 저장하는 중
  | 'covers'; // 추천 책 표지를 찾는 중 (취향 분석만)

export type AnalysisStreamEvent =
  | { type: 'stage'; stage: AnalysisStage }
  | { type: 'progress'; ratio: number }
  | { type: 'done'; analysisId: string }
  | { type: 'error'; message: string };

export const ANALYSIS_STREAM_CONTENT_TYPE = 'application/x-ndjson';

/**
 * 단계별 전체 진행률 구간(0~1). AI 답 쓰기가 시간 대부분을 차지해 가장 넓다.
 * 시작 직후에도 막대가 조금 차 있어야 "멈춤"으로 안 읽힌다.
 */
const STAGE_RANGES: Record<AnalysisStage, readonly [number, number]> = {
  analyzing: [0.05, 0.85],
  saving: [0.85, 0.92],
  covers: [0.92, 0.99],
};

/** 단계 + 그 단계 안 진행률 → 화면에 그릴 전체 진행률 */
export const toOverallProgress = (stage: AnalysisStage, ratio = 0): number => {
  const [start, end] = STAGE_RANGES[stage];
  const clamped = Math.max(0, Math.min(1, ratio));
  return start + (end - start) * clamped;
};

/** 화면에 보여 줄 단계 문구 */
export const ANALYSIS_STAGE_LABELS: Record<AnalysisStage, string> = {
  analyzing: '책장을 읽는 중',
  saving: '결과를 정리하는 중',
  covers: '추천 책 표지를 찾는 중',
};

/**
 * AI 가 지금까지 쓴 JSON 글자에서 "얼마나 썼는지"를 어림한다.
 *
 * 왜 글자 수가 아니라 키(이정표)로 재나:
 * structured outputs 는 스키마 순서대로 키를 쓴다. 어떤 키가 나왔는지,
 * 추천 책 제목("title")이 몇 개 나왔는지 세면 책장 크기와 상관없이 같은 기준으로 잰다.
 * 글자 수는 설명이 길고 짧음에 따라 들쭉날쭉하다.
 *
 * @param milestones 키 이름과, 그 키가 나왔을 때의 진행률(오름차순)
 * @param countKey   반복해서 나오는 키(예: '"title"') — 마지막 구간을 개수로 채운다
 */
export const estimateJsonProgress = (
  text: string,
  milestones: readonly (readonly [key: string, ratio: number])[],
  repeat?: { key: string; expected: number; from: number; to: number }
): number => {
  let ratio = 0;
  for (const [key, at] of milestones) {
    if (text.includes(`"${key}"`)) ratio = Math.max(ratio, at);
  }
  if (repeat && ratio >= repeat.from) {
    const count = text.split(`"${repeat.key}"`).length - 1;
    const filled = Math.min(1, count / repeat.expected);
    ratio = Math.max(ratio, repeat.from + (repeat.to - repeat.from) * filled);
  }
  return Math.min(0.98, ratio);
};

/**
 * 받은 조각(chunk)을 줄 단위로 끊는다. 한 줄이 두 조각에 나뉘어 올 수 있어
 * 마지막 미완성 줄은 다음 조각과 이어 붙인다.
 */
export const splitNdjson = (
  buffer: string
): { lines: AnalysisStreamEvent[]; rest: string } => {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  const lines: AnalysisStreamEvent[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      lines.push(JSON.parse(trimmed) as AnalysisStreamEvent);
    } catch {
      // 깨진 줄 하나 때문에 분석 전체를 실패로 보지 않는다 — 건너뛴다
    }
  }
  return { lines, rest };
};
