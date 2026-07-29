# 디자인 시스템 라운드 2 — 묶음 3 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `popover` · `dropdown-menu` · `badge` · `switch` · `ErrorFallback` 를 07 원칙에 맞게 정리하고 Figma 컴포넌트로 만든다.

**Architecture:** 코드 정리를 먼저 끝내고 그 값을 Figma 에 옮긴다. Figma 쓰기는 MCP `use_figma` 로 Plugin API 를 직접 실행한다. 묶음 2 에서 밟은 함정 다섯을 Global Constraints 에 못박았다.

**Tech Stack:** Next.js 16 · Tailwind v4 · Figma Plugin API (MCP `use_figma`) · vitest · Playwright(MCP, 계측용)

**스펙:** `docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md` §4.3

---

## Global Constraints

- Figma 파일 key: `5ErSDsG1MNfvexSDZ2PfLS` / `Components` 페이지 id: `31:2`
- **description 은 반드시 `descriptionMarkdown` 에 쓴다.** `description` 에 직접 쓰면 `<` `>` `&` `"` 가 HTML 이스케이프되고 `descriptionMarkdown` 은 빈 채로 남는다.
- **`figma.createComponent()` 는 `currentPage` 에 붙는다.** 반드시 `page.appendChild(node)` 를 명시한다 (묶음 2 에서 `Dialog` 가 `Foundations` 로 갔다).
- **`combineAsVariants()` 는 컨테이너를 늘리지 않는다.** 자식 배치 **전에** `set.resizeWithoutConstraints()` 로 세트를 키운다. 안 하면 첫 variant 만 보인다.
- **paint 의 `opacity` 는 객체 복사로 안 들어간다.** `JSON.parse(JSON.stringify(node.fills))` → 수정 → 재대입. 바인딩은 유지된다.
- **`bg-X/NN` 은 paint 불투명도, `disabled:opacity-50` 은 `node.opacity`** 다. 바꿔 쓰면 자식까지 흐려진다.
- **작업 후 반드시 `get_screenshot` 으로 눈으로 확인한다.** 스크립트 반환값은 성공처럼 보여도 화면이 깨질 수 있다 (묶음 2 의 `ReadCountBadge`).
- Variable 은 **전체 이름으로 조회**한다 — 슬래시를 포함한다(`text/strong`). `split('/').pop()` 을 쓰면 못 찾는다.
- **`use_figma` 호출마다 실행 컨텍스트가 새로 시작된다.** 앞 호출에서 정의한 `page`·`V`·`paint`·`at` 같은 헬퍼는 다음 호출로 넘어가지 않는다. **매 호출 첫머리에 다시 정의**하거나, 관련 작업을 한 호출에 묶는다. 아래 스텝들의 코드 조각은 그 전제로 읽는다.
- 모든 색·간격·radius 를 Variables 에 바인딩한다. **하드코딩 hex 0건.**
- 폰트는 **Pretendard**. 문서 프레임은 `doc/`, 메모는 `note/`.
- **새로 다는 코드 주석에 클래스 문자열(`shadow-xs`·`dark:`)을 넣지 않는다.** 검증 grep 이 자기 주석에 걸린다.
- 커밋 메시지에 `Co-Authored-By` 트레일러를 **넣지 않는다.**
- **로컬 `main` 에 커밋하지 않는다.** 이 worktree(`ds-round2-batch3`)에서만 작업하고, 병합은 PR 로 한다.

---

## File Structure

| 파일 | 이번 변경 |
|---|---|
| `apps/page0127/src/shared/ui/switch.tsx` | `shadow-xs` 1 + `dark:` 3 제거 |
| `apps/page0127/src/shared/ui/badge.tsx` | `dark:` 3 제거 + `text-white` → `text-primary-foreground` |
| `apps/page0127/src/shared/ui/dropdown-menu.tsx` | `dark:` 1 제거 |
| `apps/page0127/src/shared/ui/button.tsx` | `text-white` → `text-primary-foreground` (범위 밖이나 사용자 결정) |
| Figma `Components` 페이지 | 컴포넌트 5종 추가 + `note/` 갱신 |

`popover.tsx` · `ErrorFallback.tsx` 는 **코드를 건드리지 않는다** (07 위반 0건).

---

## Task 1: 코드 정리 4파일

**Files:**
- Modify: `apps/page0127/src/shared/ui/switch.tsx:14,22`
- Modify: `apps/page0127/src/shared/ui/badge.tsx:8,17`
- Modify: `apps/page0127/src/shared/ui/dropdown-menu.tsx:75`
- Modify: `apps/page0127/src/shared/ui/button.tsx:14`

**Interfaces:**
- Consumes: `--primary-foreground` 토큰(= `gray-0`, 흰색). `--color-primary-foreground` 가 `globals.css:49` 의 `@theme` 에 노출돼 있어 `text-primary-foreground` 가 동작한다(앱에서 이미 7곳 사용).
- Produces: Task 2·3·4 가 Figma 에 옮길 최종 클래스 값

- [ ] **Step 1: 착수 전 기준값을 기록한다**

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l   # 2
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l   # 6
grep -rn "text-white" . | wc -l                                # 3
```

기대값 `2` `6` `3`. 다르면 **멈추고 보고한다** — 다른 세션이 건드렸다는 뜻이다.

> **`text-white` 3건 중 고칠 것은 2건뿐이다.** `user-avatar.tsx:98` 은 모노그램 아바타로, 배경이 `getMonogramColor(nickname)` 이 만들어내는 **닉네임별 생성 색**이다. `destructive` 와 무관하고 대응 semantic 토큰도 없으므로 **건드리지 않는다.**

> 주석 줄을 거르는 이유: `button.tsx:15` 의 주석이 `shadow-xs` 문자열을 품고 있어, 거르지 않으면 이 값은 영원히 0이 되지 않는다.

- [ ] **Step 2: `switch.tsx` — Root 에서 둘을 뺀다**

`switch.tsx:14` 를 통째로 바꾼다.

바꾸기 전:

```
"peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
```

바꾼 뒤:

```
"peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
```

뺀 것은 정확히 둘: `dark:data-[state=unchecked]:bg-input/80` · `shadow-xs`.

- [ ] **Step 3: `switch.tsx` — Thumb 에서 다크 둘을 뺀다**

`switch.tsx:22` 를 통째로 바꾼다.

바꾸기 전:

```
"bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
```

바꾼 뒤:

```
"bg-background pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
```

- [ ] **Step 4: `badge.tsx` — base 에서 다크 하나를 뺀다**

`badge.tsx:8` 에서 `dark:aria-invalid:ring-destructive/40 ` 를 지운다. 그 줄의 나머지는 순서까지 그대로 둔다.

바꾼 뒤:

```
"inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
```

- [ ] **Step 5: `badge.tsx` — destructive 에서 다크 둘을 빼고 흰 글자를 토큰으로**

`badge.tsx:17` 을 통째로 바꾼다.

바꾸기 전:

```
"border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
```

바꾼 뒤:

```
"border-transparent bg-destructive text-primary-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20",
```

바뀐 것 셋: `dark:focus-visible:ring-destructive/40` 제거 · `dark:bg-destructive/60` 제거 · `text-white` → `text-primary-foreground`.

> **`text-white` 를 바꾸는 이유.** `--primary-foreground` 는 `gray-0`(흰색)이라 **시각 변화가 없다.** 묶음 1 이 만든 Figma Button destructive 의 글자가 이미 `primary-foreground` Variable 에 묶여 있어, 코드만 리터럴이면 한쪽만 바뀔 때 조용히 갈라진다. 사용자가 "코드를 Figma 에 맞춘다"로 결정했다.

- [ ] **Step 6: `button.tsx` — 같은 치환**

`button.tsx:14` 에서 `text-white` 를 `text-primary-foreground` 로 바꾼다. 그 줄의 나머지는 그대로.

바꾼 뒤:

```
          "bg-destructive text-primary-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20",
```

> 이 파일은 묶음 1 범위였다. 같은 이탈을 둘로 남겨두면 다음 사람이 어느 쪽이 맞는지 알 수 없어 **함께 고친다** (사용자 결정).

- [ ] **Step 7: `dropdown-menu.tsx` — Item 의 다크 하나를 뺀다**

`dropdown-menu.tsx:75` 에서 `dark:data-[variant=destructive]:focus:bg-destructive/20 ` 를 지운다.

바꾼 뒤 (줄 앞부분):

```
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none …
```

`data-[variant=destructive]:focus:bg-destructive/10`(다크 아님)은 **남긴다.**

- [ ] **Step 8: grep 으로 결과를 확인한다**

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l   # 1 (select 만)
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l   # 1 (select 만)
grep -rn "text-white" . | wc -l                                # 1 (user-avatar 만)
grep -rn "bg-black"  . | grep -vE ":[[:space:]]*//" | wc -l   # 0
```

기대값 `1` `1` `1` `0`. 하나라도 다르면 멈춘다.

남는 것의 정체를 분명히 해둔다 — `shadow-xs` 와 `dark:` 는 **묶음 4의 `select` 몫**이고, `text-white` 는 위에 적은 **`user-avatar.tsx` 의 모노그램**으로 의도적으로 남긴 것이다. `text-white` 기대값이 0이 아닌 이유가 이것이다.

- [ ] **Step 9: 테스트·타입·린트**

```bash
cd apps/page0127
npm run test          # 28파일 181개 통과
npx tsc --noEmit      # 오류 0
npx eslint src/shared/ui/badge.tsx   # shared/ui 는 ignore 대상이라 warning 만 나온다
```

> `shared/ui` 는 eslint ignore 대상이다(shadcn 생성물). warning 2줄이 나오는 것이 정상이며 error 가 0이면 통과다.

- [ ] **Step 10: 커밋**

```bash
git add apps/page0127/src/shared/ui/switch.tsx \
        apps/page0127/src/shared/ui/badge.tsx \
        apps/page0127/src/shared/ui/dropdown-menu.tsx \
        apps/page0127/src/shared/ui/button.tsx
git commit -m "$(cat <<'EOF'
♻️ Refactor: 묶음 3 코드 정리 — switch 그림자 제거, 흰 글자를 토큰으로

- switch: 표면에 붙어 있어 그림자를 뺐다 (07 §2.3)
- switch·badge·dropdown-menu: 라운드 4에서 재설계할 다크 규칙 6개 제거
- badge·button: destructive 위의 text-white 를 text-primary-foreground 로.
  값은 둘 다 흰색이라 시각 변화가 없고, Figma 가 이미 그 Variable 에
  묶여 있어 코드만 리터럴이면 조용히 갈라진다

shared/ui 에 남은 위반은 select 하나뿐이다 (묶음 4)
EOF
)"
```

---

## Task 2: Figma — Popover · Badge · Switch

**Files:** Figma `Components` 페이지(`31:2`). 코드 변경 없음.

**Interfaces:**
- Consumes: Task 1 이 확정한 클래스 값
- Produces: `Popover`(COMPONENT) · `Badge`(COMPONENT_SET) · `Switch`(COMPONENT_SET)

**배치.** 기존 노드가 y 최대 1870(`Dialog`), x 최대 1760(`note/`)을 쓴다. 이번 셋은 **y=1950 부터** 왼쪽부터 쌓는다.

- [ ] **Step 1: Variable 을 확보하고 기존 노드와 겹치지 않을 좌표를 확인한다**

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const need = ['primary','primary-foreground','secondary','secondary-foreground','destructive',
              'accent','accent-foreground','popover','popover-foreground','border','input',
              'muted-foreground','background','foreground','line','ring','text/strong','text/subtle'];
const missing = need.filter(n => !vars.some(v => v.name === n));
const maxY = Math.max(...page.children.map(c => c.y + c.height));
return JSON.stringify({ missing, nextFreeY: Math.round(maxY),
  existing: page.children.map(c => c.name) }, null, 1);
```

Expected: `missing` 이 **빈 배열**. 하나라도 있으면 멈추고 보고한다 — 임의로 hex 를 쓰지 않는다.

- [ ] **Step 2: `Popover` 를 만든다 (슬롯형 단일)**

값 (`popover.tsx:31`):

| 속성 | 값 | 근거 |
|---|---|---|
| 폭 | 288px | `w-72` |
| 안쪽 여백 | 16px | `p-4` |
| radius | 6px | `rounded-md` |
| 테두리 | 1px `line` | `border` |
| 배경 | `popover` | `bg-popover` |
| 글자 | `popover-foreground`, 14px | `text-popover-foreground` |
| 그림자 | **유지** (`shadow-md`) | 07 §2.3 예외 — 떠 있다 |

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' });
const vars = await figma.variables.getLocalVariablesAsync();
const V = (f) => { const v = vars.find(x => x.name === f); if (!v) throw new Error(`Variable 없음: ${f}`); return v; };
const paint = (f) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(f));

const pop = figma.createComponent();
pop.name = 'Popover';
pop.layoutMode = 'VERTICAL';
pop.paddingTop = 16; pop.paddingRight = 16; pop.paddingBottom = 16; pop.paddingLeft = 16;
pop.itemSpacing = 8;
pop.resizeWithoutConstraints(288, 100);
pop.counterAxisSizingMode = 'FIXED'; pop.primaryAxisSizingMode = 'AUTO';
pop.cornerRadius = 6;
pop.fills = [paint('popover')];
pop.strokes = [paint('line')]; pop.strokeWeight = 1;
// shadow-md 유지 — 07 §2.3 예외 (떠 있다)
pop.effects = [
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 6, spread: -1, visible: true, blendMode: 'NORMAL' },
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 4, spread: -2, visible: true, blendMode: 'NORMAL' },
];

const body = figma.createText();
body.name = 'PopoverContent';
body.fontName = { family: 'Pretendard', style: 'Regular' };
body.characters = '팝오버 내용이 들어갑니다.';
body.fontSize = 14;
body.lineHeight = { value: 22, unit: 'PIXELS' };
body.fills = [paint('popover-foreground')];
pop.appendChild(body);
body.layoutSizingHorizontal = 'FILL';

page.appendChild(pop);            // currentPage 가 아니라 여기로
pop.x = 0; pop.y = 1950;
return JSON.stringify({ id: pop.id, parent: pop.parent.name, size: [Math.round(pop.width), Math.round(pop.height)] }, null, 1);
```

- [ ] **Step 3: `Badge` variant set 4개를 만든다**

공통 (`badge.tsx:8`): 가로 오토레이아웃, 가운데 정렬, `gap-1`(4px), `px-2`(8px) `py-0.5`(2px), `rounded-full`, 12px / 18px, weight **500**, 테두리 1px.

variant 별 (Task 1 이후 값):

| variant | 배경 | 글자 | 테두리 |
|---|---|---|---|
| `default` | `primary` | `primary-foreground` | 투명 |
| `secondary` | `secondary` | `secondary-foreground` | 투명 |
| `destructive` | `destructive` | `primary-foreground` | 투명 |
| `outline` | 없음 | `foreground` | `border` |

```js
// V · paint 는 이 호출 안에서 다시 정의한다 (호출마다 컨텍스트가 새로 시작된다)
await figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' });
const SPECS = [
  { variant: 'default',     bg: 'primary',     fg: 'primary-foreground',   stroke: null },
  { variant: 'secondary',   bg: 'secondary',   fg: 'secondary-foreground', stroke: null },
  { variant: 'destructive', bg: 'destructive', fg: 'primary-foreground',   stroke: null },
  { variant: 'outline',     bg: null,          fg: 'foreground',           stroke: 'border' },
];
const made = [];
for (const s of SPECS) {
  const c = figma.createComponent();
  c.name = `variant=${s.variant}`;
  c.layoutMode = 'HORIZONTAL';
  c.counterAxisAlignItems = 'CENTER';
  c.primaryAxisAlignItems = 'CENTER';
  c.itemSpacing = 4;                                  // gap-1
  c.paddingLeft = 8; c.paddingRight = 8;              // px-2
  c.paddingTop = 2;  c.paddingBottom = 2;             // py-0.5
  c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
  c.cornerRadius = 999;                               // rounded-full
  c.fills = s.bg ? [paint(s.bg)] : [];
  c.strokes = s.stroke ? [paint(s.stroke)] : [];
  c.strokeWeight = 1;

  const t = figma.createText();
  t.name = 'label';
  t.fontName = { family: 'Pretendard', style: 'Medium' };   // font-medium
  t.characters = '뱃지';
  t.fontSize = 12;                                    // text-xs
  t.lineHeight = { value: 18, unit: 'PIXELS' };
  t.fills = [paint(s.fg)];
  c.appendChild(t);

  page.appendChild(c);
  made.push(c);
}
const badgeSet = figma.combineAsVariants(made, page);
badgeSet.name = 'Badge';
const PAD = 24, STEP = 40;
const cw = Math.max(...badgeSet.children.map(k => k.width));
const ch = Math.max(...badgeSet.children.map(k => k.height));
// 자식 배치 전에 세트를 먼저 키운다 — 안 하면 첫 variant 만 보인다
badgeSet.resizeWithoutConstraints(cw + PAD * 2, PAD + STEP * (badgeSet.children.length - 1) + ch + PAD);
badgeSet.children.forEach((k, i) => { k.x = PAD; k.y = PAD + i * STEP; });
badgeSet.x = 360; badgeSet.y = 1950;
```

- [ ] **Step 4: `Switch` variant set 2개를 만든다**

값 (Task 1 이후의 `switch.tsx`):

| 속성 | 값 | 근거 |
|---|---|---|
| 트랙 | 32 × 18.4 | `w-8` `h-[1.15rem]` |
| 트랙 radius | 완전 둥글게 | `rounded-full` |
| 트랙 배경 | checked `primary` / unchecked `input` | `data-[state=…]:bg-…` |
| 썸 | 16 × 16, `rounded-full`, `background` | `size-4` `bg-background` |
| 썸 위치 | unchecked 왼쪽 끝 / checked 오른쪽 끝에서 2px | `translate-x-[calc(100%-2px)]` |
| **그림자** | **없음** | Task 1 에서 제거 |

트랙 높이가 `1.15rem` = **18.4px** 라 Figma 에서는 `18.4` 를 그대로 쓴다(반올림하지 않는다).

```js
const sw = [];
for (const st of [{ state: 'unchecked', bg: 'input', x: 1.2 }, { state: 'checked', bg: 'primary', x: 14.8 }]) {
  const c = figma.createComponent();
  c.name = `state=${st.state}`;
  c.resizeWithoutConstraints(32, 18.4);        // w-8 · h-[1.15rem]
  c.cornerRadius = 9.2;
  c.fills = [paint(st.bg)];
  c.effects = [];                              // 그림자 없음 (Task 1)

  const thumb = figma.createEllipse();
  thumb.name = 'SwitchThumb';
  thumb.resizeWithoutConstraints(16, 16);      // size-4
  thumb.fills = [paint('background')];
  c.appendChild(thumb);
  thumb.x = st.x; thumb.y = 1.2;

  page.appendChild(c);
  sw.push(c);
}
const swSet = figma.combineAsVariants(sw, page);
swSet.name = 'Switch';
const P = 24, S = 40;
swSet.resizeWithoutConstraints(32 + P * 2, P + S + 18.4 + P);
swSet.children.forEach((k, i) => { k.x = P; k.y = P + i * S; });
swSet.x = 560; swSet.y = 1950;
```

- [ ] **Step 5: 셋에 description 을 단다**

```js
const at = (n) => page.children.find(c => c.name === n);

at('Popover').descriptionMarkdown = [
  '@/shared/ui/popover — <Popover> / <PopoverTrigger> / <PopoverContent>',
  '',
  'Content: w-72(288px) · p-4(16px) · rounded-md(6px) · shadow-md',
  'shadow-md 는 유지한다 — 07 §2.3 의 예외다. 팝오버는 실제로 떠 있다.',
  '',
  'Trigger 는 만들지 않았다 — 무엇이든 트리거가 될 수 있어 그릴 값이 없다.',
  'align 은 center 가 기본, sideOffset 은 4px 다.',
].join('\n');

at('Badge').descriptionMarkdown = [
  '@/shared/ui/badge — <Badge variant="secondary">',
  '',
  'rounded-full · border · px-2(8px) py-0.5(2px) · text-xs(12px) · font-medium(500) · gap-1(4px)',
  '아이콘을 넣으면 size-3(12px) 로 강제된다.',
  '',
  'destructive 의 글자는 2026-07-28 에 text-white 에서 text-primary-foreground 로 바뀌었다.',
  '값은 같은 흰색이지만, Figma 가 그 Variable 에 묶여 있어 리터럴이면 조용히 갈라진다.',
  '',
  'asChild 로 링크가 되면 hover 배경이 90% 로 어두워진다 ([a&]:hover:).',
].join('\n');

at('Switch').descriptionMarkdown = [
  '@/shared/ui/switch — <Switch checked={…} />',
  '',
  '트랙 w-8(32px) × h-[1.15rem](18.4px) · 썸 size-4(16px) · 둘 다 rounded-full',
  'checked 는 bg-primary, unchecked 는 bg-input.',
  '',
  '**h-[1.15rem] 은 임의값이라 대응 토큰이 없다.** 18.4px 는 반올림하지 않았다.',
  '토큰화 후보로 note/ 에 남겨뒀다.',
  '',
  '2026-07-28 묶음 3에서 그림자와 다크 규칙 3개를 뺐다 (07 §2.3).',
].join('\n');
```

- [ ] **Step 6: 바인딩 검증 + 스크린샷**

```js
const bad = [];
for (const name of ['Popover', 'Badge', 'Switch']) {
  const s = at(name);
  for (const n of s.findAll(() => true).concat([s])) {
    for (const prop of ['fills', 'strokes']) {
      const ps = n[prop];
      if (!Array.isArray(ps) || ps.length === 0) continue;
      ps.forEach((p, i) => {
        if (p.type !== 'SOLID') return;
        const bv = n.boundVariables && n.boundVariables[prop] && n.boundVariables[prop][i];
        if (!bv) bad.push({ component: name, node: n.name, prop });
      });
    }
  }
}
return JSON.stringify({ unboundCount: bad.length, bad }, null, 1);
```

Expected: `unboundCount` **0**.

그다음 **`get_screenshot` 으로 셋을 눈으로 확인한다.** 특히 `Badge/outline`(배경 없음)과 `Switch`(썸 위치)가 의도대로인지 본다. 묶음 2 에서 스크립트는 성공했는데 화면이 깨진 적이 있다.

- [ ] **Step 7: 커밋할 것이 없음을 확인한다**

```bash
git status --short
```

Expected: 비어 있음. Figma 변경은 git 밖이다. **커밋하지 않는다.**

---

## Task 3: Figma — DropdownMenu

**Files:** Figma `Components` 페이지(`31:2`). 코드 변경 없음.

**Interfaces:**
- Consumes: Task 1 이 정리한 `dropdown-menu.tsx`
- Produces: `DropdownMenu`(COMPONENT, 슬롯형) · `DropdownMenuItem`(COMPONENT_SET, state 3)

export 15개 중 **그릴 값이 있는 것만** 만든다.

- [ ] **Step 1: `DropdownMenu` 를 슬롯형으로 만든다**

값 (`dropdown-menu.tsx`):

| 레이어 | 속성 | 값 | 근거 |
|---|---|---|---|
| `DropdownMenuContent` | 최소 폭 | 128px | `min-w-[8rem]` |
| | 안쪽 여백 | 4px | `p-1` |
| | radius | 6px | `rounded-md` |
| | 테두리 | 1px `line` | `border` |
| | 배경 | `popover` | `bg-popover` |
| | 그림자 | **유지** `shadow-md` | 07 §2.3 예외 |
| `DropdownMenuLabel` | 여백 | `px-2`(8) `py-1.5`(6) | |
| | 글자 | 14px / weight **500** | `text-sm font-medium` |
| `DropdownMenuSeparator` | 높이 | 1px, 배경 `border` | `h-px bg-border` |
| | 여백 | 좌우 -4px, 상하 4px | `-mx-1 my-1` |
| `DropdownMenuShortcut` | 글자 | 12px, `muted-foreground`, 자간 넓게 | `text-xs tracking-widest` |
| | 정렬 | 오른쪽 끝 | `ml-auto` |

레이어 이름을 **코드 export 명과 1:1** 로 맞춘다. 폭은 200px 로 만든다(`min-w` 라 쓰는 쪽이 넓힌다).

```js
const menu = figma.createComponent();
menu.name = 'DropdownMenu';
menu.layoutMode = 'VERTICAL';
menu.paddingTop = 4; menu.paddingRight = 4; menu.paddingBottom = 4; menu.paddingLeft = 4;   // p-1
menu.itemSpacing = 0;
menu.resizeWithoutConstraints(200, 100);
menu.counterAxisSizingMode = 'FIXED'; menu.primaryAxisSizingMode = 'AUTO';
menu.cornerRadius = 6;
menu.fills = [paint('popover')];
menu.strokes = [paint('line')]; menu.strokeWeight = 1;
menu.effects = [
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 6, spread: -1, visible: true, blendMode: 'NORMAL' },
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 4, spread: -2, visible: true, blendMode: 'NORMAL' },
];
page.appendChild(menu);
menu.x = 760; menu.y = 1950;
```

- [ ] **Step 2: 슬롯 레이어를 채운다**

`DropdownMenuLabel` → `DropdownMenuItem` ×2 → `DropdownMenuSeparator` → `DropdownMenuItem`(shortcut 포함) 순으로 넣는다. 실제 메뉴가 어떻게 생겼는지 보이도록 구성한다.

```js
const row = (name, label, opts = {}) => {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = 'HORIZONTAL';
  f.counterAxisAlignItems = 'CENTER';
  f.itemSpacing = 8;                                   // gap-2
  f.paddingLeft = 8; f.paddingRight = 8;               // px-2
  f.paddingTop = 6;  f.paddingBottom = 6;              // py-1.5
  f.cornerRadius = 4;                                  // rounded-sm
  f.fills = opts.bg ? [paint(opts.bg)] : [];
  const t = figma.createText();
  t.name = 'label';
  t.fontName = { family: 'Pretendard', style: opts.medium ? 'Medium' : 'Regular' };
  t.characters = label;
  t.fontSize = 14; t.lineHeight = { value: 20, unit: 'PIXELS' };
  t.fills = [paint(opts.fg || 'text/strong')];
  f.appendChild(t);
  if (opts.shortcut) {
    const s = figma.createText();
    s.name = 'DropdownMenuShortcut';
    s.fontName = { family: 'Pretendard', style: 'Regular' };
    s.characters = opts.shortcut;
    s.fontSize = 12; s.lineHeight = { value: 18, unit: 'PIXELS' };
    s.letterSpacing = { value: 10, unit: 'PERCENT' };  // tracking-widest
    s.fills = [paint('muted-foreground')];
    f.appendChild(s);
    s.layoutPositioning = 'AUTO';
    f.primaryAxisAlignItems = 'SPACE_BETWEEN';         // ml-auto
  }
  menu.appendChild(f);
  f.layoutSizingHorizontal = 'FILL';
  return f;
};

row('DropdownMenuLabel', '내 계정', { medium: true, fg: 'text/strong' });
row('DropdownMenuItem', '프로필', {});
row('DropdownMenuItem', '설정', { shortcut: '⌘S' });

const sep = figma.createRectangle();
sep.name = 'DropdownMenuSeparator';
sep.resizeWithoutConstraints(192, 1);                  // h-px
sep.fills = [paint('border')];
menu.appendChild(sep);
sep.layoutSizingHorizontal = 'FILL';

row('DropdownMenuItem', '로그아웃', {});
```

> `-mx-1`(음수 여백)은 Figma 오토레이아웃으로 표현할 수 없다. 구분선을 **컨테이너 폭에 맞춰 FILL** 로 두는 것으로 대신하고, 그 사실을 description 에 적는다.

- [ ] **Step 3: `DropdownMenuItem` 을 별도 variant set 으로 만든다 (state 3)**

메뉴를 그릴 때 **"지금 어느 항목 위에 있는가"를 배치할 일이 있어서** Item 만 따로 뺀다.

| state | 배경 | 글자 |
|---|---|---|
| `default` | 없음 | `text/strong` |
| `hover` | `accent` | `accent-foreground` |
| `disabled` | 없음 | `text/strong` + 레이어 불투명도 **50%** |

```js
const items = [];
for (const s of [
  { state: 'default',  bg: null,     fg: 'text/strong',       op: 1 },
  { state: 'hover',    bg: 'accent', fg: 'accent-foreground', op: 1 },
  { state: 'disabled', bg: null,     fg: 'text/strong',       op: 0.5 },
]) {
  const c = figma.createComponent();
  c.name = `state=${s.state}`;
  c.layoutMode = 'HORIZONTAL';
  c.counterAxisAlignItems = 'CENTER';
  c.itemSpacing = 8;
  c.paddingLeft = 8; c.paddingRight = 8;
  c.paddingTop = 6;  c.paddingBottom = 6;
  c.resizeWithoutConstraints(192, 32);
  c.counterAxisSizingMode = 'AUTO'; c.primaryAxisSizingMode = 'FIXED';
  c.cornerRadius = 4;
  c.fills = s.bg ? [paint(s.bg)] : [];
  c.opacity = s.op;                                    // disabled:opacity-50 은 요소 전체
  const t = figma.createText();
  t.name = 'label';
  t.fontName = { family: 'Pretendard', style: 'Regular' };
  t.characters = '메뉴 항목';
  t.fontSize = 14; t.lineHeight = { value: 20, unit: 'PIXELS' };
  t.fills = [paint(s.fg)];
  c.appendChild(t);
  page.appendChild(c);
  items.push(c);
}
const itemSet = figma.combineAsVariants(items, page);
itemSet.name = 'DropdownMenuItem';
const P = 24, S = 44;
itemSet.resizeWithoutConstraints(192 + P * 2, P + S * 2 + 32 + P);
itemSet.children.forEach((k, i) => { k.x = P; k.y = P + i * S; });
itemSet.x = 1020; itemSet.y = 1950;
```

- [ ] **Step 4: description 을 단다**

```js
at('DropdownMenu').descriptionMarkdown = [
  '@/shared/ui/dropdown-menu — <DropdownMenu>',
  '',
  'Content: min-w-[8rem](128px) · p-1(4px) · rounded-md(6px) · shadow-md',
  'shadow-md 는 유지한다 — 07 §2.3 의 예외다. 메뉴는 실제로 떠 있다.',
  '',
  '레이어 이름이 코드 export 명과 1:1 이다.',
  'Label: px-2 py-1.5 · 14px / 500',
  'Item: gap-2 · px-2 py-1.5 · rounded-sm(4px) · 14px',
  'Shortcut: 12px · muted-foreground · tracking-widest · 오른쪽 끝',
  '',
  '**구분선의 -mx-1(음수 여백)은 Figma 로 표현할 수 없다.**',
  '코드에서는 구분선이 컨테이너 안쪽 여백을 4px 씩 넘어 양옆 끝까지 닿는다.',
  'Figma 에서는 여백 안에 맞춰 뒀다 — 실제 화면이 4px 씩 더 넓다.',
  '',
  '만들지 않은 것: Portal · Group · RadioGroup · Sub · SubTrigger · SubContent · Trigger',
  '(구조·동작 전용이라 그릴 값이 없다)',
].join('\n');

at('DropdownMenuItem').descriptionMarkdown = [
  '@/shared/ui/dropdown-menu — <DropdownMenuItem>',
  '',
  'gap-2(8px) · px-2(8px) py-1.5(6px) · rounded-sm(4px) · 14px',
  'hover(코드는 focus:) 는 bg-accent + text-accent-foreground.',
  'disabled 는 요소 전체가 50% 로 흐려진다.',
  '',
  'Item 만 따로 뺀 이유: 메뉴 시안에서 "지금 어느 항목 위에 있는가"를 실제로 배치한다.',
  '(Button 의 hover 는 배치할 일이 없어 문서 프레임에만 남겼다 — 기준이 다르다)',
  '',
  'variant="destructive" 를 주면 글자가 destructive 색이 되고 focus 배경이',
  'destructive 10% 가 된다. 이 세트에는 만들지 않았다 — 앱에서 쓰인 적이 없다.',
].join('\n');
```

- [ ] **Step 5: 바인딩 검증 + 스크린샷**

Task 2 Step 6 의 스크립트에서 `['DropdownMenu', 'DropdownMenuItem']` 으로 바꿔 실행한다. Expected `unboundCount` **0**.

**`get_screenshot` 으로 확인한다** — 특히 메뉴 안의 항목·구분선·단축키가 제자리에 있는지, `DropdownMenuItem/hover` 의 배경이 보이는지.

- [ ] **Step 6: 커밋할 것이 없음을 확인한다**

```bash
git status --short
```

Expected: 비어 있음. **커밋하지 않는다.**

---

## Task 4: Figma — ErrorFallback · note 갱신 · 완료 기록

**Files:**
- Figma `Components` 페이지(`31:2`)
- Modify: `docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md` (완료 기록 추가)

**Interfaces:**
- Consumes: Task 2·3 이 만든 컴포넌트
- Produces: `ErrorFallback`(COMPONENT), 갱신된 `note/만들지 않은 것`, 스펙 §6.7

- [ ] **Step 1: `ErrorFallback` 을 단일 완성형으로 만든다**

`Card` + `Button` 조합이지만 **조립 대상이 아니라 그 자체가 화면**이라 완성된 형태 하나로 만든다. 인스턴스를 품지 않고 같은 값을 직접 그린다(Figma 인스턴스에는 자식을 못 넣는다).

값 (`ErrorFallback.tsx`):

| 레이어 | 속성 | 값 | 근거 |
|---|---|---|---|
| 바깥 | 세로·가로 가운데, 여백 16px | | `flex items-center justify-center p-4` |
| `Card` | 최대 폭 448px | | `max-w-md` |
| `CardTitle` | 20px / 500 / `destructive` | | `text-destructive` |
| 본문 `p` | 14px / `muted-foreground` | | `text-muted-foreground` |
| `dev-error-box` | `destructive` **10%** 배경, `p-3`(12px), `rounded-md`(6px) | | `bg-destructive/10` |
| 버튼 2개 | 가로, `gap-2`(8px), 각각 균등 | | `flex gap-2` + `flex-1` |

> **개발 전용 상자를 어떻게 할 것인가.** `process.env.NODE_ENV === 'development'` 일 때만 렌더된다. **레이어로 만들되 이름을 `dev-error-box (개발 환경 전용)` 로 두고 `visible = false`** 로 꺼둔다. 지우면 디자이너가 존재를 모르고, 켜두면 운영 화면을 잘못 그린다.
>
> 배경은 `destructive` Variable 을 paint 로 묶고 **paint 의 `opacity` 를 0.1** 로 준다(`node.opacity` 가 아니다 — 그러면 안의 글자까지 흐려진다).

`Card` 안쪽 여백·radius 는 기존 `Card` 컴포넌트(`36:10`)를 **읽어서 같은 값**을 쓴다.

- [ ] **Step 2: description 을 단다**

```js
at('ErrorFallback').descriptionMarkdown = [
  '@/shared/ui/ErrorFallback — <ErrorFallback onRetry={…} secondaryLabel="홈으로" />',
  '',
  '전체화면 에러 fallback. shadcn 이 아니라 이 프로젝트가 직접 만든 컴포넌트다.',
  'app/error.tsx(Next 규칙)와 ErrorBoundary(Class)가 같은 화면을 복붙하던 걸 추출한 것이다.',
  '',
  'Card max-w-md(448px) · 본문 space-y-4(16px) · 버튼 2개가 flex-1 로 균등',
  '1차 동선은 onRetry(다시 시도), 2차 동선은 호출부가 라벨과 동작을 정한다.',
  '',
  '**dev-error-box 는 개발 환경에서만 보인다.** (NODE_ENV === "development")',
  '운영 화면을 그릴 때는 꺼둔 상태가 맞다 — 그래서 기본이 숨김이다.',
  '에러 메시지를 운영에 노출하지 않기 위한 의도적 분기다.',
  '',
  '조립용 슬롯이 아니라 완성된 화면이라 인스턴스를 품지 않고 값을 직접 그렸다.',
].join('\n');
```

- [ ] **Step 3: `note/만들지 않은 것` 에 묶음 3 항목을 추가한다**

기존 프레임(`x=1400, y=0`)의 서식(제목 Bold 14 / 본문 Regular 12)을 따른다. 프레임은 `primaryAxisSizingMode = 'AUTO'` 라 높이가 자동으로 는다.

```
묶음 3 — 만들지 않은 것 (2026-07-28)

DropdownMenu   Portal · Group · RadioGroup · Sub · SubTrigger ·
               SubContent · Trigger — 구조·동작 전용이라 시각이 없다.
               CheckboxItem · RadioItem 도 앱에서 쓰인 적이 없어 뺐다.

Popover        Trigger — 무엇이든 트리거가 될 수 있어 그릴 값이 없다.

DropdownMenuItem  variant="destructive" — 코드에 있으나 앱에서 0곳.

Switch         h-[1.15rem](18.4px)은 임의값이라 대응 토큰이 없다.
               크기는 그대로 두고 토큰화 후보로만 남긴다.

표현 못한 것    구분선의 -mx-1(음수 여백)은 Figma 오토레이아웃으로
               표현할 수 없다. 실제 화면이 양옆으로 4px 씩 더 넓다.
```

프레임을 키운 뒤 **최상위 노드 겹침을 다시 검사한다** (묶음 2 에서 `note/` 가 커지며 `Skeleton` 을 덮은 적이 있다).

```js
const boxes = page.children.map(c => ({ name: c.name, x1: c.x, y1: c.y, x2: c.x + c.width, y2: c.y + c.height }));
const overlaps = [];
for (let i = 0; i < boxes.length; i++)
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2) overlaps.push(`${a.name} ↔ ${b.name}`);
  }
return JSON.stringify({ overlapCount: overlaps.length, overlaps }, null, 1);
```

Expected: **0**. 0이 아니면 겹치는 쪽을 빈 자리로 옮기고 다시 검사한다.

- [ ] **Step 4: 묶음 3 전체를 검증한다**

Figma:

```js
const want = ['Popover', 'Badge', 'Switch', 'DropdownMenu', 'DropdownMenuItem', 'ErrorFallback'];
const rows = want.map(w => {
  const n = page.children.find(c => c.name === w);
  if (!n) return { name: w, found: false };
  const md = n.descriptionMarkdown || '';
  return { name: w, found: true, type: n.type, mdLen: md.length,
           mdClean: !/&lt;|&gt;|&amp;/.test(md), hasPath: md.includes('@/shared/ui/') };
});
return JSON.stringify(rows, null, 1);
```

Expected: 6개 모두 `found: true`, `mdLen > 0`, `mdClean: true`, `hasPath: true`.

코드:

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l   # 1
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l   # 1
grep -rn "text-white" . | wc -l                                # 0
cd ../../.. && npm run test
```

- [ ] **Step 5: 시각 실측 (Playwright MCP)**

`.env.local` 을 메인 작업트리에서 복사한 뒤 개발 서버를 띄운다. **3000·3100 은 다른 세션이 쓸 수 있으니 빈 포트를 먼저 확인한다.**

```bash
for p in 3220 3221 3222; do lsof -iTCP:$p -sTCP:LISTEN -t >/dev/null 2>&1 || { echo "FREE:$p"; break; }; done
```

브라우저 폭 1280px 에서 임시 노드로 계측한다(`switch`·`badge` 가 공개 페이지에 없을 수 있다).

| 확인 | 기대값 |
|---|---|
| `bg-destructive` + `text-primary-foreground` 의 `color` | `rgb(255, 255, 255)` |
| `text-white` 를 쓴 임시 노드의 `color` | 같은 `rgb(255, 255, 255)` — **둘이 같아야 치환이 무해하다** |
| `switch` 트랙 클래스의 `boxShadow` | `none` |
| `badge` 클래스의 `borderRadius` | `9999px` |

- [ ] **Step 6: 스펙에 완료 기록을 추가한다**

`docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md` 의 `## 7. 완료 기준` **앞에** `### 6.7 묶음 3 완료 기록 (2026-07-28)` 을 넣는다. §6.6(묶음 2)과 같은 서식으로, **실제 수행 결과**로 채운다: 만든 것 표 · 검증 결과 표 · Playwright 실측 · 계획과 달라진 것 · 남은 것.

- [ ] **Step 7: 커밋**

```bash
git add docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md
git commit -m "$(cat <<'EOF'
📝 Docs: 묶음 3 완료 기록 — Figma 컴포넌트 6개

Popover · Badge(variant 4) · Switch(state 2) · DropdownMenu(슬롯) ·
DropdownMenuItem(state 3) · ErrorFallback 을 Components 페이지에 추가.

구분선의 음수 여백은 Figma 로 표현할 수 없어 description 에 차이를 적었다.
EOF
)"
```

- [ ] **Step 8: PR 을 연다**

```bash
git fetch origin
git rebase origin/main          # 반드시 먼저 (아래 경고 참조)
cd apps/page0127 && npm run test && cd ../..   # 리베이스가 남의 변경을 가져왔을 수 있다
git diff --stat origin/main..HEAD              # 내 파일만 있는지 눈으로 확인
git push -u origin ds-round2-batch3
```

PR 제목은 `✨ Feat: 디자인 시스템 라운드 2 묶음 3 — Figma 컴포넌트 6개 + 07 코드 정리`.
본문은 **묶음 2 의 PR #19 와 같은 구성**으로 쓴다:

1. 무엇을 했나 (만든 컴포넌트 표)
2. 코드 변경 (diff 줄 수와 파일별 이유). **`text-white` → `text-primary-foreground` 는 시각 변화가 없다는 점과 왜 바꿨는지를 반드시 적는다** — 리뷰어가 "왜 색을 바꿨지?"로 읽으면 안 된다
3. 검증 (grep 기대값 대비 실측 표 · 테스트 · Playwright)
4. 리뷰 시 봐주실 곳 (판단이 필요한 지점만)
5. 남은 것 (묶음 4)

**로컬 `main` 에 병합하지 않는다.** 병합은 사용자가 PR 에서 한다.

> PR 을 열기 전에 **`git fetch origin && git rebase origin/main`** 을 먼저 한다. 묶음 2 때 브랜치가 4커밋 뒤처져 있어, 그대로 PR 을 열었으면 다른 사람의 `uptime.yml` 을 지울 뻔했다.

---

## 이 계획에서 하지 않는 것

- **묶음 4** — `Select` `Pagination` `Progress` `ScrollBar` `Toast`. 별도 계획서로 쓴다. 스펙 §4.4 에 구조가 있다.
- **`popover.tsx` · `ErrorFallback.tsx` 코드 수정** — 07 위반 0건이다.
- **`select` 의 `shadow-xs`·`dark:` 제거** — 묶음 4 몫이다. Task 1 Step 8 의 기대값이 0이 아니라 1인 이유다.
- **`text-white` 나머지 16곳** — destructive 배경 위가 아닌 것들은 맥락이 달라 건드리지 않는다. `shared/ui` 안의 `user-avatar.tsx:98`(닉네임별 생성 색 위의 모노그램), 랜딩 프로모 카드, 차트 툴팁, 알림 배지 등. 대응 semantic 토큰이 없고 각자 이유가 다르다.
- **`user-avatar.tsx` 자체** — 앱 어디서도 안 쓰이는 것으로 보이는 별건이 있다(기능이 화면에 연결 안 됐을 가능성). 이번 범위가 아니며, 삭제·연결 판단은 사용자 몫이다.
- **다크모드 값** — 라운드 4.

---

## 참고

- 스펙: `docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md` — §4.3(묶음 3 구조) · §4.6(descriptionMarkdown) · §6.6(묶음 2 완료 기록, 함정 넷)
- 묶음 1: `2026-07-27-design-system-round2-components-design.md` — §6.3(상태 배치 기준) · §7(description 방식)
- 07 원칙: `00_docs/07_리디자인_진단_및_실행안.md` §2.2 타이포 · §2.3 그림자
