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
 * 충분하다.
 *
 * ⚠️ 지금(2026 라운드 1) 이 스크립트를 그냥 돌리면 --secondary · --muted
 * 두 개에 diff 가 난다 (#f1f3f5 → #f6f7f8). 이것은 버그가 아니라 정상이다 —
 * baseline.json 은 "이사 전" globals.css 값을 동결한 기록이고, dist/tokens.css
 * 는 "이사 후" 승인값을 담는데, 이 두 토큰은 설계 문서 §5.2 에서 의도적으로
 * gray/50 으로 통합됐다. tests/tokens.test.ts 의 INTENTIONAL_VALUE_CHANGES 가
 * 이 차이를 이미 알고 검사한다.
 *
 * 그러니 지금은 이 스크립트를 돌리더라도 결과를 커밋하면 안 된다 — 커밋하면
 * baseline.json 이 "이사로 무엇이 바뀌었나"를 기록하는 역할을 잃고, 대신
 * INTENTIONAL_VALUE_CHANGES 가 무의미해진다(더 이상 값이 다르지 않으므로).
 *
 * 이 스크립트가 다시 쓸모 있어지는 시점은 라운드 2 이후, Figma 에서 값을
 * 바꿔 내려받았을 때다. 다만 그때는 먼저 baseline.json 의 역할을 "이사 전
 * 기록"에서 "현재 승인값"으로 전환할지부터 정해야 하고, 그 결정에는
 * INTENTIONAL_VALUE_CHANGES 를 어떻게 할지(정리할지, 유지할지)가 딸려 온다.
 * 설계 문서 §11 근처의 "미결: baseline.json 의 역할 전환" 항목 참고.
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
