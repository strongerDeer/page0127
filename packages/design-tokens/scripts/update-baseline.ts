import { readFileSync, writeFileSync } from 'node:fs';

import { normalize, parseCssVars, resolveVar } from '../src/css-vars.ts';

/**
 * tests/baseline.json 을 "현재 승인된" dist/tokens.css 값으로 갱신한다.
 *
 * 언제 쓰는가: 토큰 값이 의도적으로 바뀐 커밋에서만 쓴다 — 예를 들어 Figma
 * Variables 에서 값을 바꾸고 tokens/*.json 을 갱신한 뒤, npm run build 로
 * dist/tokens.css 를 새로 만든 다음. 이 스크립트를 돌리고 나면
 * tests/baseline.json 의 git diff 가 곧 리뷰 대상이다 — 의도한 토큰만
 * 바뀌었는지, 의도치 않은 토큰까지 같이 바뀌지 않았는지 diff 로 확인한다.
 *
 * 언제 쓰면 안 되는가: 평소 회귀 확인은 `npm run test`(baseline 과 대조)로
 * 충분하다. 값을 안 바꾼 상태에서 이 스크립트를 돌리면 diff 가 없어야
 * 정상(no-op)이다 — diff 가 생기면 빌드나 이 스크립트 어딘가가 잘못된 것이다.
 *
 * dist/tokens.css 에는 primitive 20개도 함께 있다. 기준선은 semantic 46개만
 * 담아야 하므로, 기존 baseline.json 의 키 목록을 그대로 기준 삼아 그 46개만
 * 다시 추출한다 — 즉 이 스크립트는 "키 목록"은 유지하고 "값"만 최신화한다.
 * (키 자체가 늘거나 줄었는지는 tests/tokens.test.ts 의 이름 대조 테스트가 잡는다)
 */
const generatedCss = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');
const generated = parseCssVars(generatedCss);

const previousBaseline: Record<string, string> = JSON.parse(
  readFileSync(new URL('../tests/baseline.json', import.meta.url), 'utf8'),
);

const baseline: Record<string, string> = {};
for (const name of Object.keys(previousBaseline)) {
  baseline[name] = normalize(resolveVar(generated, name));
}

writeFileSync(
  new URL('../tests/baseline.json', import.meta.url),
  `${JSON.stringify(baseline, null, 2)}\n`,
);

console.log(`기준선 ${Object.keys(baseline).length}개를 tests/baseline.json 에 갱신했다.`);
