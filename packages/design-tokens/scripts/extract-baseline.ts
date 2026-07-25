import { readFileSync, writeFileSync } from 'node:fs';

import { normalize, parseCssVars, resolveVar } from '../tests/css-vars.ts';

// 이사 전 globals.css 의 :root 46개를 "최종 계산값"으로 펼쳐 스냅샷을 만든다.
// 이 파일은 한 번만 돌린다. 결과(tests/baseline.json)를 커밋해 두고,
// 이후로는 생성물이 이 스냅샷과 같은지만 비교한다.
const globalsCss = readFileSync(
  new URL('../../../apps/page0127/app/globals.css', import.meta.url),
  'utf8',
);

const vars = parseCssVars(globalsCss, { blockSelector: ':root' });

const baseline: Record<string, string> = {};
for (const name of Object.keys(vars)) {
  baseline[name] = normalize(resolveVar(vars, name));
}

writeFileSync(
  new URL('../tests/baseline.json', import.meta.url),
  `${JSON.stringify(baseline, null, 2)}\n`,
);

console.log(`기준선 ${Object.keys(baseline).length}개를 tests/baseline.json 에 기록했다.`);
