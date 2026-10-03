import type { Analysis } from './analyze.ts';

// 측정 결과를 사람이 읽을 해석으로 바꾼다 — Claude API(Messages)를 직접 부른다.
//
// 예전엔 `claude -p` CLI 를 실행했는데, 측정은 GitHub Actions 에서 돌고 거기엔
// CLI 가 없다. 그래서 9주 내내 "생략"만 저장됐고, catch 가 원인을 삼켜서 아무도
// 몰랐다. 이제 생략할 때는 **왜 생략했는지**(키 없음/HTTP 상태/시간 초과)를 남긴다.
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-5-5';
// 2000 이었을 때 리포트가 920자에서 문장 중간에 끊겼다(2026-10-01). 한국어는
// 글자당 토큰이 많아 여유를 크게 둔다. 주 1회 호출이라 비용 차이는 미미하다.
const MAX_TOKENS = 8000;

// 상한은 AbortController 로 건다. AbortSignal.timeout() 은 라이브러리 재시도에
// 먹혀 상한이 안 지켜진 적이 있다(postgrest-js, 5ms 설정이 7초).
// 응답 상한을 올린 만큼 생성 시간도 길어질 수 있어 5분으로 둔다.
const TIMEOUT_MS = 300_000;

const buildPrompt = (a: Analysis): string =>
  `너는 page0127(독서 기록 서비스)을 혼자 만들고 운영하는 개발자를 돕는 동료다. 아래 주간 품질 측정 결과(JSON)를 보고, 훑어 읽어도 바로 이해되는 쉬운 한국어 분석을 마크다운으로 써라.
형식(반드시 지킬 것):
**핵심:** 한 문장 요약.

**주요 발견**
- 항목 (나빠진 게 있으면 어느 페이지가 원인인지 가설 포함)
- 항목

**다음 주 우선순위**
1. 액션
2. 액션
3. 액션

규칙: \`##\`·\`#\` 제목 금지(불릿/굵은 라벨만). 표·인사말 금지.

쉬운 말(가장 중요): JSON 필드명을 본문에 그대로 쓰지 마라 — \`regressions\`·\`sameDeployment\`·\`scriptKb\`·\`hreflangValid\`·\`weight\` 같은 원어 표기 금지. 우리말로 풀어 써라: 회귀→"지난주보다 나빠진 항목", weight/imageKb→"이미지 전송량", scriptKb→"JS 전송량", bundle→"첫 로드 JS", sameDeployment→"같은 배포본 재측정", hreflang→"다국어 검색 태그(hreflang)". 전문 지표는 처음 나올 때 한 번만 괄호로 짧게 풀어라 — 예: "LCP(주요 콘텐츠가 뜨는 시간)", "TTFB(서버 첫 응답 시간)". 수치는 사람 단위로 반올림해라(1444ms→약 1.4초, 835KB는 그대로). 백틱 코드 표기는 실제 파일·코드 이름에만 쓴다.

측정 해석 주의(중요): \`lcp\`·\`si\`는 느린4G 랩 측정이라 표본마다 크게 출렁인다(각 페이지 \`lcpSpreadMs\`가 그 흔들림 폭이고, \`cwv\`는 \`samples\`회 중앙값이다). 따라서 LCP/SI 한 주 변동은 회귀로 단정하지 말고, \`regressions\`에 실제로 잡힌 항목만 회귀로 다뤄라. 추세·개선/악화 판단은 노이즈가 적은 \`weight\`(전송 바이트, 특히 \`imageKb\`)·\`bundle\`·\`cls\`를 1순위로 삼아라.

폼팩터(중요): \`pages\`는 모바일(느린4G·CPU 4x 스로틀), \`desktopPages\`는 데스크탑(빠른4G·스로틀 없음) 측정이다. 데스크탑 Perf가 모바일보다 15~20점 높은 것은 측정 조건 차이일 뿐 개선이 아니다 — 절대 두 폼팩터의 점수를 맞대어 비교하거나 "데스크탑은 양호하니 괜찮다"고 결론짓지 마라. 사용자 대부분이 모바일이므로 우선순위는 모바일 기준으로 매기고, 데스크탑은 "데스크탑에서만 나타나는 문제"(예: 넓은 뷰포트에서만 로드되는 큰 이미지)를 짚을 때만 언급하라. 폼팩터별 회귀는 \`regressions[].formFactor\`로 구분된다. \`desktopPages\`가 없으면 데스크탑 미측정이니 언급하지 마라.

\`sameDeployment\`가 true이면 직전과 같은 배포본을 재측정한 것이라 코드 변화가 없다 → 모든 지표 변동은 노이즈(랩 출렁임 또는 라이브 콘텐츠 변동)이며 코드 회귀가 아니다. 이때는 \`suppressedRegressions\`를 회귀로 보고하지 말고 "동일 배포본이라 변동은 노이즈"라고만 짚어라. 진짜 개선/회귀를 보려면 새 배포 후 재측정이 필요함을 명시하라.

\`trend\`의 값이 \`unmeasured\`이면 직전 또는 이번 측정이 실패해 비교할 수 없다는 뜻이다. 그 항목은 늘었다/줄었다/개선/악화 어느 쪽으로도 말하지 말고, 필요하면 "직전 측정이 없어 비교 불가"라고만 짚어라. 같은 이유로 현재 값과 0을 맞대어 비교하지 마라.

${JSON.stringify(a, null, 2)}`;

/**
 * Messages API 응답에서 본문 텍스트만 꺼낸다.
 *
 * 응답의 content 는 블록 배열이고 텍스트는 type 'text' 블록에 있다.
 * 모양이 예상과 다르면 null — 호출부가 "생략"으로 처리한다(측정은 계속).
 */
export const extractText = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) return null;
  const content = (body as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;

  const text = content
    .filter(
      (b): b is { type: 'text'; text: string } =>
        typeof b === 'object' &&
        b !== null &&
        (b as { type?: unknown }).type === 'text' &&
        typeof (b as { text?: unknown }).text === 'string'
    )
    .map((b) => b.text)
    .join('')
    .trim();

  return text.length > 0 ? text : null;
};

/**
 * 응답이 길이 상한(max_tokens)에 걸려 끊겼는지.
 *
 * 끊긴 글을 그대로 저장하면 읽는 사람은 잘린 줄 모른다 — 표시를 붙이는 데 쓴다.
 */
export const isTruncated = (body: unknown): boolean =>
  typeof body === 'object' &&
  body !== null &&
  (body as { stop_reason?: unknown }).stop_reason === 'max_tokens';

const skipped = (reason: string): string => {
  console.warn(`[quality] 자연어 분석 생략: ${reason}`);
  return `_(자연어 분석 생략 — ${reason})_`;
};

export const buildNarrative = async (a: Analysis): Promise<string> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return skipped('ANTHROPIC_API_KEY 없음');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: buildPrompt(a) }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // 응답 본문에 원인(키 오류·크레딧 부족 등)이 담겨 온다 — 로그로만 남긴다
      const detail = await res.text().catch(() => '');
      console.warn(
        `[quality] Claude API ${res.status}: ${detail.slice(0, 300)}`
      );
      return skipped(`Claude API HTTP ${res.status}`);
    }

    const body: unknown = await res.json();
    // 종료 이유·토큰 수를 남겨 둔다 — 잘렸을 때 원인을 로그만 보고 알 수 있게
    const meta = body as { stop_reason?: unknown; usage?: unknown };
    console.error(
      `[quality] Claude API 응답: stop_reason=${String(meta.stop_reason)} usage=${JSON.stringify(meta.usage)}`
    );

    const text = extractText(body);
    if (!text) return skipped('Claude API 응답에 본문 없음');
    if (isTruncated(body)) {
      console.warn('[quality] 자연어 분석이 길이 상한에 걸려 잘림');
      return `${text}\n\n_(길이 제한으로 잘림 — MAX_TOKENS ${MAX_TOKENS})_`;
    }
    return text;
  } catch (e) {
    if (controller.signal.aborted) {
      return skipped(`Claude API ${TIMEOUT_MS / 1000}초 시간 초과`);
    }
    return skipped(`Claude API 호출 실패(${(e as Error).message})`);
  } finally {
    clearTimeout(timer);
  }
};
