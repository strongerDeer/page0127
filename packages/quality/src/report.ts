import { execFileSync } from 'node:child_process';

import type { Analysis } from './analyze.ts';

export const buildNarrative = (a: Analysis): string => {
  // a는 current 1건 + trend/regressions만 담아 작음 → argv로 충분.
  // 향후 payload에 history가 실리면 argv 길이(E2BIG) 초과 가능 → stdin(input)으로 전환할 것.
  const prompt = `너는 Novera 대표(1인 운영, 바쁘다)를 돕는 동료다. 아래 주간 품질 측정 결과(JSON)를 보고, 훑어 읽어도 바로 이해되는 쉬운 한국어 분석을 마크다운으로 써라.
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

${JSON.stringify(a, null, 2)}`;
  try {
    return execFileSync('claude', ['-p', prompt], {
      encoding: 'utf8',
      timeout: 120_000,
    }).trim();
  } catch {
    console.warn('[quality] claude -p 사용 불가 → 자연어 요약 생략');
    return '_(자연어 분석 생략 — claude CLI 미사용 환경)_';
  }
};
