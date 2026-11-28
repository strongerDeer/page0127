/**
 * Claude 클라이언트·모델 설정 — AI 분석(취향 분석·독서 케미) 공통
 *
 * 학습 포인트:
 * - 서버에서만 쓴다(환경변수 ANTHROPIC_API_KEY). 클라이언트 컴포넌트가 import 하면
 *   SDK 전체가 화면 JS 에 실린다 → app/client-server-only-imports.test.ts 가 막는다
 * - 클라이언트는 처음 쓸 때 만든다(lazy). 모듈을 읽는 순간 키를 검사하면
 *   키가 없는 빌드·테스트 환경에서 import 만 해도 터진다
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * 사용할 모델 — gpt-4o 와 단가가 비슷하고(입력 $2 / 출력 $10, 100만 토큰당)
 * 한국어 문장과 지시 따르기가 좋아 고름(2026-11-27 HJ 결정).
 */
export const AI_MODEL = 'claude-sonnet-5-5' as const;

/**
 * 얼마나 깊이 생각하고 답할지. 높을수록 답 전에 생각(thinking)을 길게 해서
 * 느려지고 출력 토큰(=비용)도 는다. 함수 상한 60초 안에 끝내려고 low 로 둔다.
 * 결과 글이 아쉬우면 dev 에서 'medium' 과 비교해 보고 올린다.
 */
export const AI_EFFORT = 'low' as const;

/**
 * 응답 길이 상한. 생각 토큰도 여기에 포함된다.
 * 잘리면 JSON 이 깨져 분석이 실패하니 넉넉히 — 비용은 실제로 만든 토큰만큼만 나간다.
 */
export const MAX_TOKENS = 8000;

/**
 * Claude 요청 제한 시간. 함수 상한(maxDuration 60초)보다 조금 짧게 둬서,
 * 플랫폼이 함수를 강제로 끊기 전에 우리가 먼저 "오류" 줄을 보낼 수 있게 한다.
 */
export const AI_REQUEST_TIMEOUT_MS = 52_000;

/**
 * 안전 분류기가 드물게 요청을 거절(stop_reason: "refusal")하면
 * 같은 요청을 대체 모델로 다시 돌린다 — 서버에서 한 번에 처리돼 코드가 따로 필요 없다.
 */
export const AI_FALLBACK_BETA = 'server-side-fallback-2026-07-01' as const;

/** 단가(달러, 토큰 1개당) — claude-sonnet-5-5 */
const INPUT_COST_PER_TOKEN = 2 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 10 / 1_000_000;

let client: Anthropic | null = null;

/** Claude 클라이언트 — 키가 없으면 첫 호출에서 알 수 있게 던진다 */
export const getClaude = (): Anthropic => {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: AI_REQUEST_TIMEOUT_MS,
    // 재시도하면 60초 상한을 넘기기 쉽다 — 한 번만 다시 해 본다
    maxRetries: 1,
  });
  return client;
};

/**
 * 토큰 사용량 → 비용(센트, 올림).
 * 입력·출력 단가가 5배 차이라 따로 계산한다. 생각 토큰은 output_tokens 에 들어 있다.
 */
export const calculateAiCostCents = (usage: {
  input_tokens: number;
  output_tokens: number;
}): number => {
  const cost =
    usage.input_tokens * INPUT_COST_PER_TOKEN +
    usage.output_tokens * OUTPUT_COST_PER_TOKEN;
  return Math.ceil(cost * 100);
};

/** AI 가 끝까지 답하지 못한 경우 — 라우트가 사용자 문구를 고른다 */
export class AiIncompleteError extends Error {
  constructor(
    readonly reason: 'refusal' | 'max_tokens' | 'empty' | 'invalid_json'
  ) {
    super(`AI 응답이 완전하지 않습니다: ${reason}`);
    this.name = 'AiIncompleteError';
  }
}

/**
 * Claude 에게 JSON 하나를 받아 온다 — 쓰는 동안 지금까지 쓴 글을 onText 로 알려 준다.
 *
 * 학습 포인트:
 * - messages.stream(): 답을 조각(text_delta)으로 받는다. 'text' 이벤트의 두 번째 인자는
 *   지금까지 쌓인 전체 글(snapshot)이라 진행률 계산에 바로 쓴다
 * - output_config.format(structured outputs): 응답을 JSON 스키마에 맞게 강제한다.
 *   예전 JSON 모드는 "JSON 처럼 생긴 글"만 보장했지만, 이건 키·타입·enum 까지 지킨다
 * - finalMessage(): 스트림이 끝나면 완성된 메시지(usage 포함)를 돌려준다
 */
export const streamClaudeJson = async <T>({
  system,
  prompt,
  schema,
  onText,
}: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  onText?: (snapshot: string) => void;
}): Promise<{
  data: T;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}> => {
  const stream = getClaude().beta.messages.stream({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    betas: [AI_FALLBACK_BETA],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: {
      effort: AI_EFFORT,
      format: { type: 'json_schema', schema },
    },
  });

  if (onText) {
    stream.on('text', (_delta, snapshot) => onText(snapshot));
  }

  const message = await stream.finalMessage();

  // stop_reason 을 먼저 본다 — 거절·잘림이면 content 가 스키마를 안 지켰을 수 있다
  if (message.stop_reason === 'refusal') throw new AiIncompleteError('refusal');
  if (message.stop_reason === 'max_tokens') {
    throw new AiIncompleteError('max_tokens');
  }

  // 대체 모델로 넘어갔으면 content 에 { type: 'fallback' } 칸이 생기고, 그 앞에는
  // 거절한 모델이 쓰다 만 글이 남을 수 있다 → 마지막 fallback 칸 뒤의 글만 쓴다
  const lastFallback = message.content.findLastIndex(
    (block) => block.type === 'fallback'
  );
  const text = message.content
    .slice(lastFallback + 1)
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');
  if (!text) throw new AiIncompleteError('empty');

  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new AiIncompleteError('invalid_json');
  }

  return {
    data,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
    // 대체 모델이 답했으면 그 이름이 온다 — 분석 기록(analysis_model)에 그대로 남긴다
    model: message.model,
  };
};
