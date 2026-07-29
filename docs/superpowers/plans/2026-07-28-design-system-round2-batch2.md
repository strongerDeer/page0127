# 디자인 시스템 라운드 2 — 묶음 2 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `textarea` · `dialog` · `avatar` · `label` · `ReadCountBadge` 를 07 원칙에 맞게 정리하고 Figma 컴포넌트로 만든다. 겸해 묶음 1이 남긴 description 손상 11건을 복구한다.

**Architecture:** 코드 정리(3파일)를 먼저 끝내고 그 값을 그대로 Figma에 옮긴다. Figma 쓰기는 MCP `use_figma`로 Plugin API를 직접 실행한다. 모든 색·간격·radius는 라운드 1의 Variables에 바인딩한다.

**Tech Stack:** Next.js 16 · Tailwind v4 · Figma Plugin API (MCP `use_figma`) · vitest · Playwright(MCP, 계측용)

**스펙:** `docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md`

---

## Global Constraints

- Figma 파일 key: `5ErSDsG1MNfvexSDZ2PfLS` / `Components` 페이지 id: `31:2`
- **description 은 반드시 `descriptionMarkdown` 에 쓴다.** `description` 에 직접 쓰면 `<` `>` `&` `"` 가 HTML 이스케이프되고 `descriptionMarkdown` 은 빈 채로 남는다 (본 계획 착수 전 왕복 테스트로 확인).
- 모든 색·간격·radius를 라운드 1 Variables에 바인딩한다. **하드코딩 hex 0건.**
- 투명도가 붙은 색(`bg-primary/15` 등)은 해당 Variable을 fill로 바인딩하고 **레이어 불투명도**로 비율을 준다. 새 Variable을 만들지 않는다.
- 폰트는 **Pretendard** (Figma에 업로드돼 있다). 로컬 설치만으로는 MCP가 못 본다.
- 문서용 프레임 이름은 `doc/<이름>`, 메모 프레임은 `note/<이름>`.
- **새로 다는 코드 주석에 클래스 문자열(`shadow-xs`·`dark:`·`bg-black`)을 넣지 않는다.** 검증 grep이 자기 주석에 걸린다.
- 커밋 메시지에 `Co-Authored-By` 트레일러를 **넣지 않는다.**
- `git push` 는 하지 않는다. 커밋까지만.

---

## File Structure

| 파일 | 역할 | 이번 변경 |
|---|---|---|
| `apps/page0127/src/shared/ui/textarea.tsx` | 여러 줄 입력 | `shadow-xs` · `dark:` 2종 제거 |
| `apps/page0127/src/shared/ui/dialog.tsx` | 모달 | 오버레이를 `bg-overlay` 토큰으로 |
| `apps/page0127/src/features/stats/ui/ReadingProgressOverview.tsx` | 독서 진행 요약 | h2를 `.heading-1` 유틸로 |
| Figma `Components` 페이지 | 컴포넌트 라이브러리 | 5개 추가 + 기존 11개 description 복구 |

`avatar.tsx` · `label.tsx` · `ReadCountBadge.tsx` 는 **코드를 건드리지 않는다** (07 위반 0건).

---

## Task 1: 코드 정리 3파일

**Files:**
- Modify: `apps/page0127/src/shared/ui/textarea.tsx:10`
- Modify: `apps/page0127/src/shared/ui/dialog.tsx:39`
- Modify: `apps/page0127/src/features/stats/ui/ReadingProgressOverview.tsx:86`

**Interfaces:**
- Consumes: `--overlay` 토큰 (라운드 1에서 신설, `packages/design-tokens/tokens/semantic.json`), `.heading-1` 유틸 (`apps/page0127/app/globals.css:134`)
- Produces: Task 3·4가 Figma에 옮길 최종 클래스 값

- [ ] **Step 1: 착수 전 기준값을 기록한다**

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l   # 3
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l   # 7
grep -rn "bg-black"  . | grep -vE ":[[:space:]]*//" | wc -l   # 1
```

세 값이 각각 `3` `7` `1` 이어야 한다. 다르면 **멈추고 보고한다** — 다른 세션이 이 파일들을 건드렸다는 뜻이다.

> `grep -vE ":[[:space:]]*//"` 로 주석 줄을 거르는 이유: `button.tsx:16` 의 주석이 `shadow-xs` 라는 문자열을 품고 있어서, 거르지 않으면 이 값은 영원히 0이 되지 않는다.

- [ ] **Step 2: `textarea.tsx` 에서 세 클래스를 뺀다**

`apps/page0127/src/shared/ui/textarea.tsx:10` 의 문자열을 통째로 아래로 바꾼다.

바꾸기 전 (현재):

```
"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
```

바꾼 뒤:

```
"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
```

뺀 것은 정확히 셋이다: `dark:aria-invalid:ring-destructive/40` · `dark:bg-input/30` · `shadow-xs`. **다른 클래스의 순서나 철자를 바꾸지 않는다.**

- [ ] **Step 3: `dialog.tsx` 오버레이를 토큰으로 바꾼다**

`apps/page0127/src/shared/ui/dialog.tsx:39` 에서 `bg-black/50` 을 `bg-overlay` 로 바꾼다. 그 줄의 나머지는 그대로 둔다.

바꾼 뒤:

```
"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
```

`--overlay` 는 `#00000080`(검정 50%)이라 **시각적으로 동일**하다. `alert-dialog.tsx` 가 이미 같은 치환을 마쳤다 — 그 파일을 참고하되 수정하지 않는다.

- [ ] **Step 4: `ReadingProgressOverview.tsx` h2를 유틸로 되돌린다**

`apps/page0127/src/features/stats/ui/ReadingProgressOverview.tsx:86`:

```diff
-              <h2 className='mt-3 break-keep text-2xl font-bold tracking-tight text-text-strong sm:text-3xl'>
+              <h2 className='heading-1 mt-3 break-keep tracking-tight text-text-strong'>
```

뺀 것: `text-2xl` · `sm:text-3xl` · `font-bold` — 셋 다 `.heading-1` 이 정한다.
남긴 것: `mt-3` · `break-keep` · `tracking-tight` · `text-text-strong` — 유틸이 정하지 않는 값이다.

> **의도된 동작 변화 하나 (회귀가 아니다).** `.heading-1` 의 데스크톱 전환점은 **768px**(`globals.css:140`)이고 현재 코드는 `sm:`(**640px**)이다. 따라서 **640~767px 구간에서 글자가 30px → 24px 로 작아진다.** 이는 나머지 24개 파일이 이미 쓰는 전환점에 맞추는 것이므로 의도된 정렬이다. 리뷰에서 회귀로 판정하지 않는다.

- [ ] **Step 5: grep 으로 결과를 확인한다**

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l   # 2 (switch, select 만 남음)
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l   # 6
grep -rn "bg-black"  . | grep -vE ":[[:space:]]*//" | wc -l   # 0
cd ../../..
grep -rn "sm:text-3xl" --include="*.tsx" src app | wc -l      # 0
grep -rn "font-semibold" --include="*.tsx" src app | grep -vE ":[[:space:]]*//" | wc -l   # 0
```

기대값 `2` `6` `0` `0` `0`. 하나라도 다르면 멈춘다.

- [ ] **Step 6: 기존 테스트를 돌린다**

```bash
cd apps/page0127 && npm run test
```

Expected: PASS. 토큰 테스트 4종이 전부 통과해야 한다.

> `dark:bg-input/30` 을 지우면 `--input` 토큰의 사용처가 하나 준다. `token-usage.test.ts` 는 *"쓰는데 정의가 없는 것"* 을 잡지 그 반대는 아니므로 통과한다. **토큰이 덜 쓰이게 되는 것은 정리의 결과이지 회귀가 아니다.**

- [ ] **Step 7: 타입·린트 확인**

```bash
cd apps/page0127 && npx tsc --noEmit
npx eslint src/shared/ui/textarea.tsx src/shared/ui/dialog.tsx src/features/stats/ui/ReadingProgressOverview.tsx
```

Expected: 둘 다 오류 0.

- [ ] **Step 8: 커밋**

```bash
git add apps/page0127/src/shared/ui/textarea.tsx \
        apps/page0127/src/shared/ui/dialog.tsx \
        apps/page0127/src/features/stats/ui/ReadingProgressOverview.tsx
git commit -m "$(cat <<'EOF'
♻️ Refactor: 묶음 2 코드 정리 — textarea 그림자·다크 제거, dialog 오버레이 토큰화

- textarea: 표면에 붙어 있어 그림자를 뺐다 (07 §2.3)
- textarea: 라운드 4에서 다시 설계할 다크 규칙 2개를 뺐다
- dialog: 오버레이를 overlay 토큰으로 — 앱에 남은 마지막 하드코딩 검정
- ReadingProgressOverview: h2 를 heading-1 유틸로. 손으로 쓴 30px 가
  07 스케일 밖이었다. 데스크톱 전환점이 640px 에서 768px 로 바뀐다
EOF
)"
```

---

## Task 2: 묶음 1 description 손상 11건 복구

**Files:** 코드 변경 없음. Figma `Components` 페이지(`31:2`)만 수정한다.

**Interfaces:**
- Consumes: 없음
- Produces: **`descriptionMarkdown` 을 쓴다**는 규칙 — Task 3·4·5가 그대로 따른다

**배경.** 묶음 1이 `node.description = '...'` 으로 썼는데, 이 setter 는 `<` `>` `&` `"` 를 HTML 이스케이프한다. 그 결과 11개 노드에 `&lt;Button&gt;` 같은 문자열이 저장됐고, `Card` 는 읽고-고쳐-쓰기를 반복해 `&amp;amp;lt;Card&amp;amp;gt;` 까지 갔다. 더불어 **11개 전부 `descriptionMarkdown` 이 비어 있다.**

- [ ] **Step 1: 손상 범위를 다시 센다 (착수 시점 확인)**

MCP `use_figma`, fileKey `5ErSDsG1MNfvexSDZ2PfLS`:

```js
const hits = [];
for (const p of figma.root.children) {
  await p.loadAsync();
  for (const n of p.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) {
    const d = n.description || '';
    if (/&lt;|&gt;|&amp;|&quot;/.test(d)) {
      hits.push({ id: n.id, name: n.name, mdEmpty: (n.descriptionMarkdown || '') === '' });
    }
  }
}
return JSON.stringify({ count: hits.length, hits }, null, 1);
```

Expected: `count` 가 **11**, 전부 `mdEmpty: true`.

- [ ] **Step 2: 언이스케이프해서 `descriptionMarkdown` 으로 옮긴다**

```js
const unescape = (s) => {
  let prev, cur = s, i = 0;
  do {
    prev = cur;
    cur = cur.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
             .replace(/&amp;/g, '&');
    i++;
  } while (cur !== prev && i < 10);
  return cur;
};

const done = [];
for (const p of figma.root.children) {
  await p.loadAsync();
  for (const n of p.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) {
    const d = n.description || '';
    if (!/&lt;|&gt;|&amp;|&quot;/.test(d)) continue;
    const fixed = unescape(d);
    n.descriptionMarkdown = fixed;
    done.push({ id: n.id, name: n.name, head: fixed.slice(0, 50) });
  }
}
return JSON.stringify({ fixed: done.length, done }, null, 1);
```

`&amp;` 를 **마지막에** 푸는 것이 핵심이다. 먼저 풀면 `&amp;lt;` 가 `&lt;` 가 됐다가 같은 패스에서 `<` 로 한 번에 넘어가 다중 이스케이프를 못 되돌린다. 루프가 안정될 때까지 반복해 `Card` 의 3중 이스케이프까지 푼다.

- [ ] **Step 3: 복구를 검증한다**

```js
const bad = [], ok = [];
for (const p of figma.root.children) {
  await p.loadAsync();
  for (const n of p.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) {
    const md = n.descriptionMarkdown || '';
    if (!md) continue;
    if (/&lt;|&gt;|&amp;|&quot;/.test(md)) bad.push({ id: n.id, name: n.name, md: md.slice(0, 80) });
    else ok.push({ name: n.name, head: md.slice(0, 40) });
  }
}
return JSON.stringify({ okCount: ok.length, badCount: bad.length, bad, ok }, null, 1);
```

Expected: `badCount` **0**, `okCount` **11**. `ok` 의 `head` 들이 `@/shared/ui/button — <Button>` 처럼 **꺾쇠가 살아 있는 평문**이어야 한다.

- [ ] **Step 4: 커밋할 것이 없음을 확인한다**

```bash
git status --short
```

Expected: 비어 있음. Figma 변경은 git 밖이다. **이 태스크는 커밋하지 않는다.**

---

## Task 3: Figma — Textarea · Label · Avatar

**Files:** Figma `Components` 페이지(`31:2`). 코드 변경 없음.

**Interfaces:**
- Consumes: Task 1이 확정한 `textarea` 클래스, Task 2가 세운 `descriptionMarkdown` 규칙
- Produces: `Textarea`(COMPONENT_SET) · `Label`(COMPONENT_SET) · `Avatar`(COMPONENT_SET)

**배치.** 기존 노드가 y=0~1378, x=0~1280 을 쓴다. 이번 셋은 **y=1450 부터** 아래로 쌓는다.

**참고할 기존 노드:** `Input` COMPONENT_SET(`39:18`, x=0 y=1074) 이 같은 4상태 구조다. **읽어서 구조를 본떠라** — 값은 아래 표를 따른다.

- [ ] **Step 1: 바인딩할 Variable 의 id 를 확보한다**

```js
const vars = await figma.variables.getLocalVariablesAsync();
const want = ['line','line-soft','bg-surface','text-strong','text-subtle','text-faint',
              'primary','destructive','ring','muted','input','background'];
const map = {};
for (const v of vars) { const k = v.name.split('/').pop(); if (want.includes(k)) map[k] = { id: v.id, name: v.name }; }
return JSON.stringify({ found: Object.keys(map), map }, null, 1);
```

찾은 이름과 id 를 기록해 이후 스텝에서 쓴다. **없는 이름이 있으면 멈추고 보고한다** — 임의로 hex 를 쓰지 않는다.

- [ ] **Step 2: `Textarea` variant set 4개를 만든다**

`state=default` / `state=focus` / `state=error` / `state=disabled`.

공통 (Task 1 이후의 `textarea.tsx` 값):

| 속성 | 값 | 근거 클래스 |
|---|---|---|
| 최소 높이 | 64px | `min-h-16` |
| 가로 패딩 | 12px | `px-3` |
| 세로 패딩 | 8px | `py-2` |
| radius | 6px | `rounded-md` |
| 테두리 | 1px, `line` Variable | `border` `border-input` |
| 배경 | 투명 | `bg-transparent` |
| 글자 | 14px / 22px, `text-strong` | `md:text-sm` |
| placeholder 색 | `text-subtle` | `placeholder:text-muted-foreground` |
| **그림자** | **없음** | Task 1에서 제거 |

상태별 차이:

| state | 테두리 | 그 밖 |
|---|---|---|
| `default` | `line` | — |
| `focus` | `ring` | 바깥쪽 3px ring, `ring` 50% 불투명도 |
| `error` | `destructive` | 바깥쪽 3px ring, `destructive` 20% 불투명도 |
| `disabled` | `line` | 레이어 불투명도 **50%** (`disabled:opacity-50`) |

폭은 320px 로 만든다(예시 폭 — `w-full` 이라 쓰는 쪽이 정한다).

**만드는 코드.** Variable 바인딩은 `setBoundVariableForPaint` 를 쓴다 — 색을 직접 넣고 나중에 바인딩하는 방식이 아니다.

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' });

const vars = await figma.variables.getLocalVariablesAsync();
const V = (key) => {
  const v = vars.find(x => x.name.split('/').pop() === key);
  if (!v) throw new Error(`Variable 없음: ${key}`);   // 임의 hex 로 대체하지 않는다
  return v;
};
// Variable 을 fill 로 묶는다. 두 번째 인자 'color' 는 Paint 의 어느 필드를 묶을지다.
const paintOf = (key) => figma.variables.setBoundVariableForPaint(
  { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(key)
);

// 상태별 테두리 색만 다르다
const STATES = [
  { state: 'default',  border: 'line',        opacity: 1   },
  { state: 'focus',    border: 'ring',        opacity: 1   },
  { state: 'error',    border: 'destructive', opacity: 1   },
  { state: 'disabled', border: 'line',        opacity: 0.5 },  // disabled:opacity-50
];

const made = [];
for (const s of STATES) {
  const c = figma.createComponent();
  c.name = `state=${s.state}`;
  c.resize(320, 64);                        // min-h-16 = 64px
  c.layoutMode = 'VERTICAL';
  c.paddingLeft = 12; c.paddingRight = 12;  // px-3
  c.paddingTop = 8;  c.paddingBottom = 8;   // py-2
  c.cornerRadius = 6;                       // rounded-md
  c.fills = [];                             // bg-transparent
  c.strokes = [paintOf(s.border)];
  c.strokeWeight = 1;
  c.opacity = s.opacity;
  // 그림자 없음 — Task 1 에서 뺐다 (07 §2.3)
  c.effects = [];

  const t = figma.createText();
  t.fontName = { family: 'Pretendard', style: 'Regular' };
  t.characters = '내용을 입력하세요';
  t.fontSize = 14;                          // md:text-sm
  t.lineHeight = { value: 22, unit: 'PIXELS' };
  t.fills = [paintOf('text-subtle')];       // placeholder 색
  c.appendChild(t);

  page.appendChild(c);
  made.push(c);
}
return JSON.stringify({ made: made.map(m => ({ id: m.id, name: m.name })) }, null, 1);
```

`focus` 와 `error` 의 바깥 ring(3px)은 `effects` 에 `DROP_SHADOW` 가 아니라 **`strokes` 를 하나 더 두거나 바깥 프레임**으로 표현한다. `Input`(`39:18`)이 이미 그렇게 돼 있으니 **그 노드를 읽어 같은 방식을 쓴다.**

- [ ] **Step 3: `combineAsVariants` 후 좌표를 직접 배치한다**

앞 스텝이 만든 4개를 하나의 세트로 묶는다. `made` 는 Step 2가 만든 배열이다.

```js
const set = figma.combineAsVariants(made, page);
set.name = 'Textarea';

// combineAsVariants 직후 자식들이 전부 같은 좌표에 겹친다 — 반드시 직접 배치한다
const GAP = 24;
set.children.forEach((child, i) => { child.x = 0; child.y = i * (64 + GAP); });

set.x = 0;
set.y = 1450;
return JSON.stringify({ id: set.id, w: Math.round(set.width), h: Math.round(set.height) }, null, 1);
```

Expected: `h` 가 대략 `4 × 64 + 3 × 24 = 328` 근처. **57×36 처럼 작게 나오면 겹친 것이다** — 묶음 1에서 실제로 겪은 함정이다.

> **묶음 1에서 실제로 겪은 함정이다.** `combineAsVariants()` 직후 자식이 전부 같은 좌표에 겹쳐 세트 크기가 57×36 으로 나왔다. `x`/`y` 를 손으로 넣어야 한다.

- [ ] **Step 4: `Textarea` 에 description 을 단다**

```js
set.descriptionMarkdown = [
  '@/shared/ui/textarea — <Textarea>',
  '',
  'min-h-16(64px) · px-3(12px) · py-2(8px) · rounded-md(6px) · 14px',
  '모바일은 16px(text-base), md 이상에서 14px 로 줄어든다 — iOS 확대 방지.',
  '',
  '상태를 variant 로 둔 이유: 폼 디자인에서는 에러 상태를 실제로 화면에 배치한다.',
  '(Button 은 hover 를 배치할 일이 없어 문서 프레임에만 남겼다)',
  '',
  '2026-07-28 묶음 2에서 shadow 와 dark 규칙을 뺐다 (07 §2.3, 라운드 4에서 재설계).',
].join('\n');
```

**`descriptionMarkdown` 이다.** `description` 에 쓰면 꺾쇠가 깨진다 (Global Constraints).

- [ ] **Step 5: `Label` variant set 2개를 만든다**

`state=default` / `state=disabled`. x=400, y=1450.

| 속성 | 값 | 근거 클래스 |
|---|---|---|
| 레이아웃 | 가로, 가운데 정렬, 간격 8px | `flex items-center gap-2` |
| 글자 | 14px, weight **500**, 줄간격 14px | `text-sm font-medium leading-none` |
| 색 | `text-strong` | — |
| `disabled` | 레이어 불투명도 **50%** | `peer-disabled:opacity-50` |

> ⚠️ **`use_figma` 호출마다 실행 컨텍스트가 새로 시작된다.** Step 2에서 정의한 `V`·`paintOf` 는 다음 호출로 넘어가지 않는다. 한 호출 안에서 다시 정의하거나, Label·Avatar 를 Step 2와 같은 호출에 넣는다.

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
await figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' });
const vars = await figma.variables.getLocalVariablesAsync();
const V = (k) => { const v = vars.find(x => x.name.split('/').pop() === k); if (!v) throw new Error(`Variable 없음: ${k}`); return v; };
const paintOf = (k) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(k));

const labels = [];
for (const s of [{ state: 'default', opacity: 1 }, { state: 'disabled', opacity: 0.5 }]) {
  const c = figma.createComponent();
  c.name = `state=${s.state}`;
  c.layoutMode = 'HORIZONTAL';                 // flex
  c.counterAxisAlignItems = 'CENTER';          // items-center
  c.itemSpacing = 8;                           // gap-2
  c.primaryAxisSizingMode = 'AUTO';
  c.counterAxisSizingMode = 'AUTO';
  c.fills = [];
  c.opacity = s.opacity;

  const t = figma.createText();
  t.fontName = { family: 'Pretendard', style: 'Medium' };  // font-medium = 500
  t.characters = '이메일';
  t.fontSize = 14;                             // text-sm
  t.lineHeight = { value: 14, unit: 'PIXELS' }; // leading-none
  t.fills = [paintOf('text-strong')];
  c.appendChild(t);

  page.appendChild(c);
  labels.push(c);
}
const labelSet = figma.combineAsVariants(labels, page);
labelSet.name = 'Label';
labelSet.children.forEach((ch, i) => { ch.x = 0; ch.y = i * 40; });
labelSet.x = 400; labelSet.y = 1450;

labelSet.descriptionMarkdown = [
  '@/shared/ui/label — <Label>',
  '',
  'text-sm(14px) · font-medium(500) · leading-none · gap-2(8px)',
  '',
  '**disabled 는 직접 지정하는 prop 이 아니다.**',
  '코드는 peer-disabled:opacity-50 — 형제 input 이 disabled 일 때 자동으로 흐려진다.',
  'Figma 에서 variant 로 보이지만 Label 에 줄 수 있는 값이 아니다.',
].join('\n');
```

> 이 경고를 빠뜨리면 "Label 에 disabled prop 이 있다"는 오해가 그대로 굳는다. **반드시 넣는다.**

- [ ] **Step 6: `Avatar` variant set 2개를 만든다**

`type=image` / `type=fallback`. x=700, y=1450.

| 속성 | 값 | 근거 클래스 |
|---|---|---|
| 크기 | 32×32 | `size-8` |
| radius | 원형 (16px) | `rounded-full` |
| `image` | 이미지 자리 사각형, 정사각 채움 | `aspect-square size-full` |
| `fallback` | 배경 `muted`, 가운데 이니셜 14px | `bg-muted flex items-center justify-center` |

`fallback` 의 이니셜은 예시로 `HJ` 를 넣고 색은 `text-strong` 으로 바인딩한다.

```js
// V · paintOf 는 이 호출 안에서 다시 정의한다 (Step 5의 ⚠️ 참조)
const avatars = [];
for (const kind of ['image', 'fallback']) {
  const c = figma.createComponent();
  c.name = `type=${kind}`;
  c.resize(32, 32);                  // size-8
  c.cornerRadius = 16;               // rounded-full
  c.clipsContent = true;             // overflow-hidden

  if (kind === 'fallback') {
    c.fills = [paintOf('muted')];    // bg-muted
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisAlignItems = 'CENTER';
    c.counterAxisAlignItems = 'CENTER';
    const t = figma.createText();
    t.fontName = { family: 'Pretendard', style: 'Medium' };
    t.characters = 'HJ';
    t.fontSize = 14;
    t.fills = [paintOf('text-strong')];
    c.appendChild(t);
  } else {
    // 이미지 자리 — 실제 이미지 대신 line-soft 로 채운 사각형을 둔다
    c.fills = [paintOf('line-soft')];
    const inner = figma.createRectangle();
    inner.name = 'AvatarImage';
    inner.resize(32, 32);            // aspect-square size-full
    inner.fills = [paintOf('line-soft')];
    c.appendChild(inner);
  }
  page.appendChild(c);
  avatars.push(c);
}
const avatarSet = figma.combineAsVariants(avatars, page);
avatarSet.name = 'Avatar';
avatarSet.children.forEach((ch, i) => { ch.x = 0; ch.y = i * 56; });
avatarSet.x = 700; avatarSet.y = 1450;

avatarSet.descriptionMarkdown = [
  '@/shared/ui/avatar — <Avatar> / <AvatarImage> / <AvatarFallback>',
  '',
  'size-8(32px) · rounded-full · overflow-hidden',
  '이미지가 없거나 로드에 실패하면 Radix 가 자동으로 fallback 을 보여준다.',
  '크기는 쓰는 쪽이 className 으로 바꾼다 (size-8 은 기본값).',
].join('\n');
```

- [ ] **Step 7: 하드코딩 색이 없는지 검증한다**

```js
const targets = ['Textarea', 'Label', 'Avatar'];
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
const bad = [];
for (const t of targets) {
  const set = page.children.find(c => c.name === t);
  if (!set) { bad.push({ name: t, reason: 'not found' }); continue; }
  for (const n of set.findAll(() => true).concat([set])) {
    const fills = n.fills;
    if (!Array.isArray(fills)) continue;
    fills.forEach((f, i) => {
      if (f.type !== 'SOLID') return;
      const bound = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills[i];
      if (!bound) bad.push({ node: n.name, parent: t, type: 'unbound fill' });
    });
  }
}
return JSON.stringify({ badCount: bad.length, bad }, null, 1);
```

Expected: `badCount` **0**. 0이 아니면 그 fill 을 Variable 에 바인딩하고 다시 돌린다.

- [ ] **Step 8: 커밋할 것이 없음을 확인한다**

```bash
git status --short
```

Expected: 비어 있음. **커밋하지 않는다.**

---

## Task 4: Figma — Dialog

**Files:** Figma `Components` 페이지(`31:2`). 코드 변경 없음.

**Interfaces:**
- Consumes: Task 1이 확정한 `bg-overlay` 오버레이, Task 2의 `descriptionMarkdown` 규칙
- Produces: `Dialog`(COMPONENT, 슬롯형)

**참고할 기존 노드:** `AlertDialog`(`40:12`, x=560 y=595, 720×420) 가 **동형**이다. 먼저 읽어 레이어 트리를 확인하고 같은 방식으로 만든다.

- [ ] **Step 1: `AlertDialog` 의 구조를 읽는다**

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
const ad = page.children.find(c => c.name === 'AlertDialog');
const walk = (n, d) => ({ name: n.name, type: n.type, w: Math.round(n.width), h: Math.round(n.height),
  children: (d < 3 && 'children' in n) ? n.children.map(c => walk(c, d + 1)) : undefined });
return JSON.stringify(walk(ad, 0), null, 1);
```

- [ ] **Step 2: `Dialog` 컴포넌트를 만든다 — 슬롯은 레이어 이름으로**

**컴포넌트는 하나만 만든다.** 슬롯을 개별 컴포넌트로 쪼개지 않는다 — Figma 인스턴스에는 자식을 추가할 수 없어, 슬롯이 각각 컴포넌트면 조립이 오히려 불가능해진다 (묶음 1 §8.5①).

레이어 이름을 코드 슬롯명과 **1:1** 로 맞춘다:

```
Dialog                    ← COMPONENT
├ DialogOverlay           ← overlay Variable, 100% 를 덮는 사각형
└ DialogContent
  ├ DialogHeader
  │ ├ DialogTitle
  │ └ DialogDescription
  ├ DialogBody            ← 코드의 children 자리. 슬롯임을 이름으로 표시
  ├ DialogFooter
  └ DialogClose
```

값 (`dialog.tsx` 실측):

| 레이어 | 속성 | 값 | 근거 |
|---|---|---|---|
| `DialogOverlay` | 채우기 | `overlay` Variable | `bg-overlay` (Task 1) |
| `DialogContent` | 최대 폭 | 512px | `sm:max-w-lg` |
| `DialogContent` | 안쪽 여백 | 24px | `p-6` |
| `DialogContent` | 세로 간격 | 16px | `gap-4` |
| `DialogContent` | radius | 8px | `rounded-lg` |
| `DialogContent` | 테두리 | 1px `line` | `border` |
| `DialogContent` | 배경 | `bg-surface` | `bg-background` |
| `DialogContent` | 그림자 | **유지** (`shadow-lg`) | 07 §2.3 예외 — 실제로 떠 있다 |
| `DialogHeader` | 세로 간격 | 8px | `gap-2` |
| `DialogTitle` | 글자 | 18px / 27px / weight **500** | `text-lg font-medium` |
| `DialogDescription` | 글자 | 14px / 22px, `text-subtle` | `text-sm text-muted-foreground` |
| `DialogFooter` | 가로, 오른쪽 정렬, 간격 8px | | `gap-2` |
| `DialogClose` | 16×16, 오른쪽 위 16px | | `top-4 right-4` `size-4` |

전체 프레임은 720×420 으로 만들고 x=700, y=1750 에 둔다.

> `DialogTitle` 이 이미 `font-medium`(500) 이다 — 타이포 재검토(2026-07-28)의 일괄 치환에 포함됐다. **600 으로 되돌리지 않는다.**

**만드는 코드.** 슬롯은 오토레이아웃 프레임이고, **이름이 코드 슬롯명과 정확히 같아야** 한다.

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
await figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' });
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' });
const vars = await figma.variables.getLocalVariablesAsync();
const V = (k) => { const v = vars.find(x => x.name.split('/').pop() === k); if (!v) throw new Error(`Variable 없음: ${k}`); return v; };
const paintOf = (k) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(k));
const text = (name, chars, style, fs, lh, colorKey) => {
  const t = figma.createText();
  t.name = name;
  t.fontName = { family: 'Pretendard', style };
  t.characters = chars;
  t.fontSize = fs;
  t.lineHeight = { value: lh, unit: 'PIXELS' };
  t.fills = [paintOf(colorKey)];
  return t;
};

const dialog = figma.createComponent();
dialog.name = 'Dialog';
dialog.resize(720, 420);
dialog.fills = [];

// 오버레이 — 전체를 덮는다. overlay Variable 은 이미 검정 50% 를 담고 있으므로
// paint opacity 를 따로 주지 않는다 (이중 적용 방지).
const overlay = figma.createRectangle();
overlay.name = 'DialogOverlay';
overlay.resize(720, 420);
overlay.x = 0; overlay.y = 0;
overlay.fills = [paintOf('overlay')];
dialog.appendChild(overlay);

const content = figma.createFrame();
content.name = 'DialogContent';
content.layoutMode = 'VERTICAL';
content.itemSpacing = 16;                       // gap-4
content.paddingLeft = 24; content.paddingRight = 24;
content.paddingTop = 24;  content.paddingBottom = 24;   // p-6
content.cornerRadius = 8;                       // rounded-lg
content.fills = [paintOf('bg-surface')];        // bg-background
content.strokes = [paintOf('line')];
content.strokeWeight = 1;
content.resize(512, 200);                       // sm:max-w-lg
content.counterAxisSizingMode = 'FIXED';
content.primaryAxisSizingMode = 'AUTO';
// shadow-lg 는 유지한다 — 07 §2.3 의 예외 (모달은 실제로 떠 있다)
content.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 },
  offset: { x: 0, y: 10 }, radius: 15, spread: -3, visible: true, blendMode: 'NORMAL' }];

const header = figma.createFrame();
header.name = 'DialogHeader';
header.layoutMode = 'VERTICAL';
header.itemSpacing = 8;                         // gap-2
header.fills = [];
header.layoutSizingHorizontal = 'FILL';
header.appendChild(text('DialogTitle', '정말 삭제할까요?', 'Medium', 18, 27, 'text-strong'));
header.appendChild(text('DialogDescription', '이 작업은 되돌릴 수 없습니다.', 'Regular', 14, 22, 'text-subtle'));
content.appendChild(header);

const body = figma.createFrame();
body.name = 'DialogBody';                       // 코드의 children 자리
body.layoutMode = 'VERTICAL';
body.fills = [];
body.resize(464, 48);
content.appendChild(body);

const footer = figma.createFrame();
footer.name = 'DialogFooter';
footer.layoutMode = 'HORIZONTAL';
footer.primaryAxisAlignItems = 'MAX';           // 오른쪽 정렬
footer.itemSpacing = 8;                         // gap-2
footer.fills = [];
footer.layoutSizingHorizontal = 'FILL';
content.appendChild(footer);

const close = figma.createRectangle();
close.name = 'DialogClose';
close.resize(16, 16);                           // size-4
close.fills = [paintOf('text-subtle')];
content.appendChild(close);
// 코드는 absolute top-4 right-4 다 — 오토레이아웃 흐름에서 빼고 좌표를 직접 준다.
// 이 두 줄이 없으면 닫기 버튼이 Footer 아래로 밀려난다.
close.layoutPositioning = 'ABSOLUTE';
close.x = content.width - 16 - 16;              // right-4
close.y = 16;                                   // top-4

dialog.appendChild(content);
content.x = (720 - 512) / 2;
content.y = 60;

dialog.x = 700; dialog.y = 1750;
return JSON.stringify({ id: dialog.id, layers: dialog.findAll(() => true).map(n => n.name) }, null, 1);
```

Expected: `layers` 에 `DialogOverlay` `DialogContent` `DialogHeader` `DialogTitle` `DialogDescription` `DialogBody` `DialogFooter` `DialogClose` 가 전부 있어야 한다.

> `DialogClose` 를 `content` 의 마지막 자식으로 붙이면 오토레이아웃이 세로로 밀어낸다. 코드는 `absolute top-4 right-4` 다 — Figma 에서는 `close.layoutPositioning = 'ABSOLUTE'` 로 빼고 `x`/`y` 를 직접 준다.

- [ ] **Step 3: description 을 단다**

```js
dialog.descriptionMarkdown = [
  '@/shared/ui/dialog — <Dialog>',
  '',
  'Overlay + Content 구조. AlertDialog 와 같은 형태지만 쓰임이 다르다:',
  'AlertDialog 는 확인/취소를 강제하고, Dialog 는 자유 내용 + 닫기 버튼이다.',
  '',
  'Content: rounded-lg(8px) · p-6(24px) · gap-4(16px) · max-w-lg(512px)',
  'Header: 세로 gap-2(8px) / Footer: 가로 오른쪽 정렬 gap-2(8px)',
  'Title: 18px / 500 / Description: 14px',
  '',
  'shadow-lg 는 유지한다 — 07 §2.3 의 예외다. 모달은 실제로 떠 있다.',
  '오버레이는 2026-07-28 에 overlay 토큰으로 바뀌었다 (그전엔 하드코딩 검정 50%).',
  '',
  '레이어 이름이 코드 슬롯명과 1:1 이다 — 레이어 트리가 곧 JSX 구조다.',
  'showCloseButton={false} 를 주면 DialogClose 가 사라진다.',
].join('\n');
```

- [ ] **Step 4: 하드코딩 색이 없는지 검증한다**

Task 3 Step 7 의 스크립트에서 `targets` 를 `['Dialog']` 로 바꿔 실행한다.

Expected: `badCount` **0**.

- [ ] **Step 5: 커밋할 것이 없음을 확인한다**

```bash
git status --short
```

Expected: 비어 있음. **커밋하지 않는다.**

---

## Task 5: Figma — ReadCountBadge · note 갱신 · 문서 기록

**Files:**
- Figma `Components` 페이지(`31:2`)
- Modify: `docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md` (완료 기록 추가)

**Interfaces:**
- Consumes: Task 2의 `descriptionMarkdown` 규칙
- Produces: `ReadCountBadge`(COMPONENT_SET), 갱신된 `note/만들지 않은 것`

- [ ] **Step 1: `ReadCountBadge` variant set 3개를 만든다**

`size=sm` / `size=md` / `size=lg`. x=0, y=2250.

공통:

| 속성 | 값 | 근거 클래스 |
|---|---|---|
| 레이아웃 | 가로, 가운데 정렬, 간격 4px | `inline-flex items-center gap-1` |
| radius | 완전 둥글게 | `rounded-full` |
| 배경 | `primary` Variable + **레이어 불투명도 15%** | `bg-primary/15` |
| 글자 색 | `primary` | `text-primary` |
| weight | 500 | `font-medium` |
| 아이콘 | 12×12 책 모양, `primary` | `h-3 w-3` |

size 별 차이:

| size | 가로 패딩 | 세로 패딩 | 글자 |
|---|---|---|---|
| `sm` | 8px | 2px | 12px / 18px |
| `md` | 10px | 4px | 14px / 22px |
| `lg` | 12px | 6px | 16px / 24px |

텍스트는 `3회독` 을 예시로 넣는다.

> 배경은 **새 Variable 을 만들지 않는다.** `primary` 를 fill 로 바인딩하고 **paint 의 `opacity` 를 0.15** 로 준다. 레이어 전체 불투명도(`node.opacity`)를 쓰면 **글자와 아이콘까지 흐려진다** — 코드의 `bg-primary/15` 는 배경만 15%다.

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
await figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' });
const vars = await figma.variables.getLocalVariablesAsync();
const V = (k) => { const v = vars.find(x => x.name.split('/').pop() === k); if (!v) throw new Error(`Variable 없음: ${k}`); return v; };
const paintOf = (k, opacity) => {
  const p = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(k));
  return opacity === undefined ? p : { ...p, opacity };   // bg-primary/15 → opacity 0.15
};

const SIZES = [
  { size: 'sm', px: 8,  py: 2, fs: 12, lh: 18 },
  { size: 'md', px: 10, py: 4, fs: 14, lh: 22 },
  { size: 'lg', px: 12, py: 6, fs: 16, lh: 24 },
];

const badges = [];
for (const s of SIZES) {
  const c = figma.createComponent();
  c.name = `size=${s.size}`;
  c.layoutMode = 'HORIZONTAL';
  c.counterAxisAlignItems = 'CENTER';       // items-center
  c.itemSpacing = 4;                        // gap-1
  c.paddingLeft = s.px; c.paddingRight = s.px;
  c.paddingTop = s.py;  c.paddingBottom = s.py;
  c.primaryAxisSizingMode = 'AUTO';
  c.counterAxisSizingMode = 'AUTO';
  c.cornerRadius = 999;                     // rounded-full
  c.fills = [paintOf('primary', 0.15)];     // 배경만 15%

  const icon = figma.createRectangle();     // 책 아이콘 자리 (h-3 w-3)
  icon.name = 'icon/book';
  icon.resize(12, 12);
  icon.cornerRadius = 2;
  icon.fills = [paintOf('primary')];        // 아이콘은 불투명
  c.appendChild(icon);

  const t = figma.createText();
  t.fontName = { family: 'Pretendard', style: 'Medium' };  // font-medium
  t.characters = '3회독';
  t.fontSize = s.fs;
  t.lineHeight = { value: s.lh, unit: 'PIXELS' };
  t.fills = [paintOf('primary')];           // 글자도 불투명
  c.appendChild(t);

  page.appendChild(c);
  badges.push(c);
}
const badgeSet = figma.combineAsVariants(badges, page);
badgeSet.name = 'ReadCountBadge';
badgeSet.children.forEach((ch, i) => { ch.x = 0; ch.y = i * 48; });
badgeSet.x = 0; badgeSet.y = 2250;
return JSON.stringify({ id: badgeSet.id, h: Math.round(badgeSet.height) }, null, 1);
```

책 아이콘은 사각형 자리표시자로 둔다. 코드의 SVG path 를 그대로 옮기려면 `figma.createNodeFromSvg()` 를 쓸 수 있으나, **12×12 자리표시자로 충분하다** — 이 컴포넌트의 값은 크기·색·패딩이지 아이콘 모양이 아니다. 자리표시자로 뒀다는 사실을 description 에 적는다.

- [ ] **Step 2: description 을 단다**

```js
badgeSet.descriptionMarkdown = [
  '@/shared/ui/ReadCountBadge — <ReadCountBadge readCount={3} />',
  '',
  '재독 횟수 뱃지. shadcn 이 아니라 이 프로젝트가 직접 만든 컴포넌트다.',
  '',
  'sm: px-2(8px) py-0.5(2px) 12px / md: px-2.5(10px) py-1(4px) 14px',
  'lg: px-3(12px) py-1.5(6px) 16px',
  '배경은 primary 를 15% 불투명도로 쓴다 (bg-primary/15).',
  '',
  '**readCount 가 1 이하면 아무것도 렌더하지 않는다 (null 을 반환한다).**',
  '1회독은 보통이라 표시할 값이 없다는 뜻이다 — Figma 에는 그 상태를 만들 수 없다.',
  '',
  '아이콘은 12×12 자리표시자다. 코드는 책 모양 인라인 SVG 를 쓴다.',
].join('\n');
```

- [ ] **Step 3: `note/만들지 않은 것` 프레임에 이번 항목을 추가한다**

기존 프레임(x=560, y=0)의 텍스트 레이어에 아래를 덧붙인다. 프레임 높이는 내용에 맞게 늘린다.

```
묶음 2 (2026-07-28)
· ReadCountBadge 의 "숨김" 상태 — readCount<=1 이면 null 을 반환한다.
  "없음"은 Figma 에 만들 수 없다.
· Dialog 의 슬롯을 개별 컴포넌트로 만들지 않았다 — 인스턴스에 자식을
  추가할 수 없어서다. 레이어 이름으로 슬롯을 표시한다.
```

> 텍스트 레이어의 `characters` 는 이스케이프되지 않는다(확인함). `descriptionMarkdown` 규칙은 description 에만 해당한다.

- [ ] **Step 4: 묶음 2 전체를 검증한다**

Figma:

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
const want = ['Textarea', 'Label', 'Avatar', 'Dialog', 'ReadCountBadge'];
const rows = want.map(w => {
  const n = page.children.find(c => c.name === w);
  return { name: w, found: !!n, type: n && n.type,
           mdLen: n ? (n.descriptionMarkdown || '').length : 0,
           mdClean: n ? !/&lt;|&gt;|&amp;/.test(n.descriptionMarkdown || '') : false };
});
return JSON.stringify(rows, null, 1);
```

Expected: 5개 모두 `found: true`, `mdLen > 0`, `mdClean: true`.

코드:

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l   # 2
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l   # 6
grep -rn "bg-black"  . | grep -vE ":[[:space:]]*//" | wc -l   # 0
cd /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 && npm run test
```

- [ ] **Step 5: 시각 실측 (Playwright MCP)**

개발 서버를 띄우고(`cd apps/page0127 && npm run dev`) 계측한다. `.env.local` 이 없으면 메인 작업트리에서 복사한다 (gitignore 대상이라 worktree 에 안 딸려온다).

브라우저 폭을 **1280px** 로 두고:

| 확인 | 기대값 |
|---|---|
| `textarea` 의 `boxShadow` | `none` |
| `textarea` 의 `borderColor` | 변화 없음 (`--line`) |
| `dialog` 오버레이의 `backgroundColor` | `rgba(0, 0, 0, 0.5)` |
| `ReadingProgressOverview` h2 의 `fontSize` | `28px` |
| 같은 h2 의 `lineHeight` | `40px` |
| 같은 h2 의 `fontWeight` | `700` |

폭 **700px**(640~767 구간)에서 같은 h2 의 `fontSize` 가 `24px` 이면 정상이다 — Task 1 Step 4의 의도된 변화다.

- [ ] **Step 6: 스펙에 완료 기록을 추가한다**

`docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md` 의 `## 7. 완료 기준` **앞에** 아래 절을 넣는다. 실제 수행 결과로 채운다 — 아래는 뼈대다.

```markdown
### 6.6 묶음 2 완료 기록 (2026-07-28)

만든 것: `Textarea`(state 4) · `Label`(state 2) · `Avatar`(type 2) · `Dialog`(슬롯형) · `ReadCountBadge`(size 3)

코드 정리: `textarea` 그림자·다크 3개, `dialog` 오버레이 토큰화, `ReadingProgressOverview` 유틸 복귀

검증 결과: (grep 실측값 / 테스트 통과 여부 / Playwright 계측값을 여기 적는다)

**계획과 달라진 것:** (없으면 "없다" 라고 적는다)
```

- [ ] **Step 7: 커밋**

```bash
git add docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md
git commit -m "$(cat <<'EOF'
📝 Docs: 묶음 2 완료 기록 — Figma 컴포넌트 5개, description 손상 11건 복구

- Textarea·Label·Avatar·Dialog·ReadCountBadge 를 Components 페이지에 추가
- 묶음 1이 description 에 직접 써서 생긴 HTML 이스케이프 11건을
  descriptionMarkdown 으로 옮겨 복구
EOF
)"
```

---

## 이 계획에서 하지 않는 것

- **묶음 3·4** — 별도 계획서로 쓴다. 스펙(`2026-07-28-...-batch234-design.md`) §4.3·§4.4 에 구조가 이미 있다.
- **`avatar.tsx` · `label.tsx` · `ReadCountBadge.tsx` 코드 수정** — 07 위반이 0건이다. 건드리지 않는다.
- **`switch` · `badge` · `dropdown-menu` · `select` 의 `dark:` 제거** — 묶음 3·4 몫이다. Task 1 Step 5의 기대값 `2` `6` 이 0이 아닌 이유다.
- **`git push`** — 사용자가 따로 요청할 때까지 하지 않는다.
- **다크모드 값** — 라운드 4.

---

## 참고

- 스펙: `docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md`
- 묶음 1: `docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md` — §6.3(상태 배치 기준) · §8.5(구현 중 달라진 것) · §8.6(`combineAsVariants` 겹침)
- 타이포: `docs/superpowers/specs/2026-07-28-typography-scale-revision-design.md`
- 07 원칙: `00_docs/07_리디자인_진단_및_실행안.md` §2.2 타이포 · §2.3 그림자
