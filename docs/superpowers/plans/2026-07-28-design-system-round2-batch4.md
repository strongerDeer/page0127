# 디자인 시스템 라운드 2 — 묶음 4 구현 계획 (마지막)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `select` · `pagination` · `progress` · `scroll-area` · `sonner` 를 Figma 컴포넌트로 만들고, **`shared/ui` 의 07 위반을 0으로 만든다.** 겸해 묶음 1의 Button 인구조사 오류를 바로잡는다.

**Architecture:** `select.tsx:38` 한 줄만 고치면 코드 정리가 끝난다. Figma 는 묶음 2·3 에서 확립한 패턴을 그대로 쓴다. Button 세트에 빠진 실사용 조합 6개를 채운다.

**Tech Stack:** Next.js 16 · Tailwind v4 · Figma Plugin API (MCP `use_figma`) · vitest

**스펙:** `docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md` §4.4

---

## Global Constraints

- Figma 파일 key: `5ErSDsG1MNfvexSDZ2PfLS` / `Components` 페이지 id: `31:2`
- **description 은 반드시 `descriptionMarkdown` 에 쓴다.** `description` 에 직접 쓰면 `<` `>` `&` `"` 가 HTML 이스케이프된다.
- **`figma.createComponent()` 는 `currentPage` 에 붙는다.** 반드시 `page.appendChild(node)` 를 명시한다.
- **`combineAsVariants()` 는 컨테이너를 늘리지 않는다.** 자식 배치 **전에** `set.resizeWithoutConstraints()` 로 세트를 키운다.
- **paint 의 `opacity` 는 객체 복사로 안 들어간다.** `JSON.parse(JSON.stringify(node.fills))` → 수정 → 재대입.
- **`bg-X/NN` 은 paint 불투명도, `disabled:opacity-50` 은 `node.opacity`** 다.
- **`use_figma` 호출마다 실행 컨텍스트가 새로 시작된다.** 헬퍼(`page`·`V`·`paint`)를 매 호출 첫머리에 다시 정의한다.
- **작업 후 반드시 `get_screenshot` 으로 눈으로 확인한다.** 스크립트 반환값은 성공처럼 보여도 화면이 깨질 수 있다.
- Variable 은 **전체 이름으로 조회**한다(`text/strong` 처럼 슬래시 포함).
- **기존 노드 값을 재사용할 때 `0 || 기본값` 을 쓰지 않는다.** 0 을 삼킨다 (묶음 3 의 `Card.paddingLeft`).
- **`note/`·`doc/` 프레임을 건드리면 겹침 검사를 다시 돌린다.** 오토레이아웃이라 높이가 늘며 옆 노드를 덮는다.
- **바인딩 검증은 컴포넌트가 아니라 페이지 전체로 돌린다.** 현재 페이지 전체 누락 0 — 이 상태를 유지한다.
- 모든 색·간격·radius 를 Variables 에 바인딩한다. **하드코딩 hex 0건.**
- **새로 다는 코드 주석에 클래스 문자열(`shadow-xs`·`dark:`)을 넣지 않는다.**
- 커밋 메시지에 `Co-Authored-By` 트레일러를 **넣지 않는다.**
- **로컬 `main` 에 커밋·병합하지 않는다.** 이 worktree(`ds-round2-batch4`)에서만 작업하고 병합은 PR 로 한다.

---

## File Structure

| 파일 | 이번 변경 |
|---|---|
| `apps/page0127/src/shared/ui/select.tsx` | `shadow-xs` 1 + `dark:` 3 제거 — **`shared/ui` 마지막 위반** |
| Figma `Components` 페이지 | 컴포넌트 5종 추가 + Button 세트 6조합 보강 + `note/` 정정 |

`pagination.tsx` · `progress.tsx` · `scroll-area.tsx` · `sonner.tsx` 는 **코드를 건드리지 않는다** (07 위반 0건).

---

## Task 1: `select` 코드 정리 — 마지막 위반

**Files:** Modify `apps/page0127/src/shared/ui/select.tsx:38`

**Interfaces:**
- Consumes: 없음
- Produces: Task 3 이 Figma 에 옮길 `SelectTrigger` 최종 값

- [ ] **Step 1: 착수 전 기준값**

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l   # 1
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l   # 1
grep -rn "bg-black"  . | grep -vE ":[[:space:]]*//" | wc -l   # 0
```

기대값 `1` `1` `0`. 둘 다 `select.tsx:38` 한 줄에 있다. 다르면 멈추고 보고한다.

> 주석 줄을 거르는 이유: `button.tsx:15-16` 의 주석이 `shadow-xs` 문자열을 품고 있다.

- [ ] **Step 2: `select.tsx:38` 에서 넷을 뺀다**

그 줄을 통째로 바꾼다.

바꾸기 전:

```
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

바꾼 뒤:

```
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

뺀 것은 정확히 넷: `dark:aria-invalid:ring-destructive/40` · `dark:bg-input/30` · `dark:hover:bg-input/50` · `shadow-xs`.

> `dark:hover:bg-input/50` 을 빼면 **다크모드에서만 있던 hover 배경이 사라진다.** 라이트모드에는 원래 hover 배경이 없었으므로 현재 화면은 변하지 않는다. 라운드 4에서 다크 hover 를 다시 설계할 때 이 자리를 채운다.

- [ ] **Step 3: 07 위반이 0이 됐는지 확인한다**

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l   # 0
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l   # 0
grep -rn "bg-black"  . | grep -vE ":[[:space:]]*//" | wc -l   # 0
grep -rn "font-semibold" . | wc -l                             # 0
```

**넷 다 0이어야 한다.** 이것이 라운드 2 전체의 종료 조건이다.

`text-white` 는 **1** 이 남는다 — `user-avatar.tsx:98` 의 모노그램(닉네임별 생성 색 위라 대응 토큰이 없다). 0을 기대하지 않는다.

- [ ] **Step 4: 테스트·타입**

```bash
cd apps/page0127
npm run test          # 29파일 192개 통과
npx tsc --noEmit      # 오류 0
```

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/src/shared/ui/select.tsx
git commit -m "$(cat <<'EOF'
♻️ Refactor: 묶음 4 코드 정리 — select 그림자·다크 제거

shared/ui 의 07 위반이 0이 됐다. 라운드 2 코드 정리 완료.

- select: 표면에 붙어 있어 그림자를 뺐다 (07 §2.3)
- select: 라운드 4에서 재설계할 다크 규칙 3개 제거.
  그중 hover 배경은 다크모드 전용이라 현재 화면은 변하지 않는다
EOF
)"
```

---

## Task 2: Figma Button 보강 — 묶음 1 인구조사 정정

**Files:** Figma `Components` 페이지, `Button` 세트(`31:21`)와 `note/만들지 않은 것`.

**Interfaces:**
- Consumes: 기존 Button 세트의 6개 variant (`31:5` `31:8` `31:11` `31:14` `31:17` `31:20`)
- Produces: 12조합으로 늘어난 Button 세트, 정정된 `note/`

**배경.** 묶음 1의 `note/` 는 *"ghost · link · secondary 는 코드에 정의는 있으나 앱에서 쓰인 적이 없다"*, *"size icon · icon-sm · icon-lg 는 아이콘 전용 버튼이 앱에 0곳이다"* 라고 적었다. **전수 조사 결과 틀렸다.**

`<Button …>` 87건을 파싱한 실제 조합(명시하지 않은 prop 은 CVA 기본값으로 계산):

| 조합 | 건수 | 파일수 | 현재 Figma |
|---|---:|---:|---|
| `outline / default` | 20 | 18 | ✅ |
| `default / default` | 18 | 16 | ✅ |
| **`ghost / sm`** | **15** | 10 | ❌ |
| `outline / sm` | 13 | 10 | ✅ |
| `default / sm` | 12 | 7 | ✅ |
| `default / lg` | 2 | 2 | ❌ |
| `ghost / icon` | 2 | 2 | ❌ |
| `outline / icon-sm` | 2 | 1 | ❌ |
| `destructive / default` | 1 | 1 | ✅ |
| `secondary / default` | 1 | 1 | ❌ |
| `ghost / default` | 1 | 1 | ❌ |

`link` 은 실제로 **0건**이라 만들지 않는다(묶음 1 기록 중 유일하게 맞은 항목). 기존 `destructive / sm` 은 실사용 0건이지만 **지우지 않는다** — 세트에서 variant 를 제거하면 그 조합을 참조하는 인스턴스가 깨지고, 남겨두는 비용은 없다.

- [ ] **Step 1: 기존 Button variant 하나를 읽어 구조를 파악한다**

```js
const page = figma.root.children.find(p => p.name === 'Components');
await page.loadAsync();
const set = page.children.find(c => c.name === 'Button');
const vars = await figma.variables.getLocalVariablesAsync();
const nameOf = (a) => { if (!a) return null; const v = vars.find(x => x.id === a.id); return v ? v.name : null; };
const d = (n) => ({
  name: n.name, type: n.type, w: Math.round(n.width), h: Math.round(n.height),
  layoutMode: n.layoutMode, pad: n.paddingTop !== undefined ? [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft] : null,
  gap: n.itemSpacing, radius: n.cornerRadius,
  fill: nameOf(n.boundVariables && n.boundVariables.fills && n.boundVariables.fills[0]),
  stroke: nameOf(n.boundVariables && n.boundVariables.strokes && n.boundVariables.strokes[0]),
  children: ('children' in n) ? n.children.map(c => ({
    name: c.name, type: c.type, chars: c.type === 'TEXT' ? c.characters : null,
    fs: c.type === 'TEXT' ? c.fontSize : null, font: c.type === 'TEXT' ? c.fontName : null,
    fill: nameOf(c.boundVariables && c.boundVariables.fills && c.boundVariables.fills[0])
  })) : []
});
return JSON.stringify({
  setSize: [Math.round(set.width), Math.round(set.height)],
  variantProps: set.variantGroupProperties,
  children: set.children.map(d)
}, null, 1);
```

읽은 값(패딩·radius·글자 크기·폰트)을 **그대로** 새 조합에 쓴다. 임의로 정하지 않는다.

- [ ] **Step 2: 빠진 6조합을 만든다**

`button.tsx` 의 CVA 정의가 근거다.

variant 스타일:

| variant | 배경 | 글자 | 테두리 |
|---|---|---|---|
| `ghost` | **없음** (투명) | `text/strong` | 없음 |
| `secondary` | `secondary` | `secondary-foreground` | 없음 |

size 스타일:

| size | 높이 | 가로 패딩 | radius |
|---|---|---|---|
| `default` | 36 (`h-9`) | 16 (`px-4`) | 6 |
| `sm` | 32 (`h-8`) | 12 (`px-3`) | 6 |
| `lg` | 40 (`h-10`) | 24 (`px-6`) | 6 |
| `icon` | 36×36 (`size-9`) | — (정사각) | 6 |
| `icon-sm` | 32×32 (`size-8`) | — (정사각) | 6 |

만들 6개: `ghost/sm` · `ghost/icon` · `ghost/default` · `secondary/default` · `default/lg` · `outline/icon-sm`

`icon` 계열은 정사각형이고 글자 대신 **16×16 아이콘 자리표시자**(`[&_svg]:size-4`)를 넣는다. 자리표시자임을 레이어 이름 `icon/placeholder` 로 표시한다.

새 컴포넌트를 만든 뒤 **기존 세트에 넣는다**:

```js
// 새로 만든 컴포넌트를 기존 Button 세트의 자식으로 옮긴다
set.appendChild(newComponent);
newComponent.name = 'variant=ghost, size=sm';   // 이름이 곧 variant 조합이다
```

이름 형식은 기존과 정확히 같아야 한다(`variant=X, size=Y`). 다르면 Figma 가 별도 property 로 인식한다.

- [ ] **Step 3: 세트를 다시 배치한다**

12개가 되므로 격자로 다시 깐다. `combineAsVariants` 를 쓰지 않고 기존 세트에 추가했으므로 **세트 크기를 직접 늘려야** 한다.

```js
const PAD = 24, COL = 3, GAPX = 24, GAPY = 24;
const kids = set.children;
const cw = Math.max(...kids.map(k => k.width));
const ch = Math.max(...kids.map(k => k.height));
const rows = Math.ceil(kids.length / COL);
set.resizeWithoutConstraints(PAD * 2 + COL * cw + (COL - 1) * GAPX,
                             PAD * 2 + rows * ch + (rows - 1) * GAPY);
kids.forEach((k, i) => {
  k.x = PAD + (i % COL) * (cw + GAPX);
  k.y = PAD + Math.floor(i / COL) * (ch + GAPY);
});
```

배치 후 **아래쪽 노드와 겹치는지 검사한다** — Button 은 y=0 에 있고 `doc/Button 상태` 가 y=320 에 있다. 세트가 커지면 덮는다.

- [ ] **Step 4: Button 세트 description 을 갱신한다**

```js
set.descriptionMarkdown = [
  '@/shared/ui/button — <Button>',
  '',
  '앱에서 87곳이 쓴다. CVA 에는 variant 6 × size 6 = 36 조합이 정의돼 있고,',
  '실사용은 11조합이다. 그 11개를 전부 만들었다(+ destructive/sm 은 묶음 1 잔재).',
  '',
  '많이 쓰이는 순: outline/default 20 · default/default 18 · ghost/sm 15 ·',
  'outline/sm 13 · default/sm 12 · 나머지는 1~2건.',
  '',
  'variant 를 생략하면 default, size 를 생략하면 default 다.',
  'hover 는 default/destructive 가 90%, secondary 가 80%, outline/ghost 는 accent 배경.',
  '',
  '만들지 않은 것: link (실제로 0건) · icon-lg (0건)',
  '',
  '2026-07-28 묶음 4에서 6조합을 보강했다 — 묶음 1의 인구조사가 ghost 를',
  '"쓰인 적 없음"으로 잘못 적어 15건짜리 조합이 빠져 있었다.',
].join('\n');
```

- [ ] **Step 5: `note/만들지 않은 것` 의 틀린 문장을 정정한다**

기존 `note/variant   ghost · li` 텍스트 레이어의 내용을 아래로 **교체**한다(추가가 아니라 교체다 — 틀린 문장을 남겨두면 안 된다).

```
variant   link
          코드(button.tsx)에 정의는 있으나 앱에서 0건이다.

size      icon-lg
          앱에서 0건이다.

실사용은 11조합이고 전부 만들었다.
필요해지면 코드와 Figma 에 함께 추가한다 — Figma 에만 만들면
디자이너와 개발자가 서로 다른 것을 보게 된다.

정정 (2026-07-28, 묶음 4)
  묶음 1은 ghost · secondary · icon · icon-sm 을 "쓰인 적 없음"으로
  적었으나 틀렸다. ghost 는 18건(13개 파일)으로 outline 다음으로 많다.
  세는 방식이 불완전했던 것으로 보인다 — 이후로는 여는 태그를 파싱해
  variant × size 조합을 전수로 센다.
```

정정 후 **겹침 검사를 다시 돌린다**.

- [ ] **Step 6: 검증 + 스크린샷**

```js
const set = page.children.find(c => c.name === 'Button');
const names = set.children.map(c => c.name).sort();
const want = ['variant=default, size=default','variant=default, size=sm','variant=default, size=lg',
  'variant=outline, size=default','variant=outline, size=sm','variant=outline, size=icon-sm',
  'variant=destructive, size=default','variant=destructive, size=sm',
  'variant=ghost, size=default','variant=ghost, size=sm','variant=ghost, size=icon',
  'variant=secondary, size=default'].sort();
return JSON.stringify({ count: names.length, names, matches: JSON.stringify(names) === JSON.stringify(want) }, null, 1);
```

Expected: `count` **12**, `matches` **true**.

**`get_screenshot` 으로 세트를 눈으로 본다** — `ghost` 는 배경이 없어 빈칸처럼 보일 수 있다. 글자가 제대로 있는지 확인한다.

- [ ] **Step 7: 커밋할 것이 없음을 확인한다**

```bash
git status --short
```

Expected: 비어 있음. **커밋하지 않는다.**

---

## Task 3: Figma — Select · Pagination

**Files:** Figma `Components` 페이지.

**Interfaces:**
- Consumes: Task 1 이 정리한 `select.tsx`, Task 2 가 보강한 Button 세트
- Produces: `Select`(COMPONENT_SET, state 4) · `SelectMenu`(COMPONENT, 슬롯) · `Pagination`(COMPONENT, 슬롯)

**배치.** 현재 최대 y 는 2350(`ErrorFallback`). 이번 것들은 **y=2450 부터** 왼쪽부터 쌓는다.

- [ ] **Step 1: `Select` Trigger 를 state 4 variant set 으로 만든다**

`Input`(`39:18`)·`Textarea`(`65:14`)와 **같은 ring 래퍼 구조**다. 그 노드를 읽어 같은 방식으로 만든다.

값 (Task 1 이후의 `select.tsx:38`):

| 속성 | 값 | 근거 |
|---|---|---|
| 높이 | 36 (기본) | `data-[size=default]:h-9` |
| 가로 패딩 | 12 | `px-3` |
| 세로 패딩 | 8 | `py-2` |
| radius | 6 | `rounded-md` |
| 테두리 | 1px `input` | `border-input` |
| 배경 | 투명 | `bg-transparent` |
| 글자 | 14 / 22 | `text-sm` |
| placeholder 색 | `muted-foreground` | `data-[placeholder]:text-muted-foreground` |
| 아이콘 | 16×16 오른쪽 (`ChevronDown`) | `[&_svg]:size-4` |
| 정렬 | 양끝 정렬 | `justify-between` `gap-2` |
| **그림자** | **없음** | Task 1 에서 제거 |

상태별: `default` 테두리 `input` / `focus` 3px ring `ring` / `error` 3px ring `destructive` / `disabled` 레이어 불투명도 50%.

- [ ] **Step 2: `SelectMenu` 를 슬롯형으로 만든다**

코드의 `SelectContent` + `SelectItem` 구조다. **`DropdownMenu`(`88:2`)와 거의 같으므로 그 노드를 읽어 본뜬다.**

| 레이어 | 값 | 근거 |
|---|---|---|
| `SelectContent` | `min-w-[8rem]`(128) · `p-1`(4) · `rounded-md`(6) · `border` 1px `line` · `bg-popover` · `shadow-md` | |
| `SelectItem` | `gap-2`(8) · `py-1.5`(6) · `pl-2`(8) · **`pr-8`(32)** · `rounded-sm`(4) · 14px | 오른쪽은 체크 아이콘 자리라 넓다 |
| 선택된 항목 | 오른쪽에 16×16 체크 자리표시자 | `SelectPrimitive.ItemIndicator` |

이름을 `SelectMenu` 로 하는 이유: 코드의 `Select` 는 Trigger+Content 를 모두 감싸는 루트인데, Figma 에서는 Trigger(variant set)와 Content(슬롯)를 따로 둬야 한다. **코드에 `SelectMenu` 라는 이름은 없다** — description 에 명시한다.

- [ ] **Step 3: `Pagination` 을 슬롯형으로 만든다**

**`PaginationLink` 는 `buttonVariants` 를 그대로 쓴다** — `isActive` 면 `outline`, 아니면 `ghost`, size 는 기본 `icon`(36×36).

Task 2 에서 `ghost/icon` 과 `outline/icon-sm` 을 만들었으므로, **Pagination 안에서는 같은 값을 직접 그린다**(Figma 인스턴스에 자식을 못 넣는 제약 때문에 Button 인스턴스를 품지 않는다).

구성: `Previous` · 페이지 번호 4개(하나는 활성) · `Ellipsis` · `Next`

| 레이어 | 값 | 근거 |
|---|---|---|
| `PaginationContent` | 가로, `gap-1`(4px), 가운데 정렬 | |
| `PaginationLink` | 36×36, `rounded-md`(6) | `size=icon` |
| 활성 항목 | 테두리 1px `border` + 배경 `background` | `variant=outline` |
| 비활성 항목 | 배경 없음 | `variant=ghost` |
| `PaginationPrevious`/`Next` | 높이 36, `px-2.5`(10), `gap-1`(4), 아이콘 16 + 글자 14 | `size=default` + `px-2.5` |
| `PaginationEllipsis` | 36×36, 아이콘 16 | `size-9` `size-4` |

- [ ] **Step 4: 셋에 description 을 단다**

`Select` 에는 위 §Step 2 의 이름 불일치를, `Pagination` 에는 `buttonVariants` 재사용 사실을 반드시 적는다.

```js
at('Pagination').descriptionMarkdown = [
  '@/shared/ui/pagination — <Pagination>',
  '',
  'PaginationLink 는 buttonVariants 를 그대로 쓴다:',
  '  isActive 면 variant=outline, 아니면 variant=ghost. size 기본값은 icon(36×36).',
  '  Previous/Next 만 size=default + px-2.5.',
  '',
  '즉 이 컴포넌트의 시각은 Button 이 정한다 — Button 을 바꾸면 여기도 바뀐다.',
  'Figma 에서는 인스턴스에 자식을 넣을 수 없어 Button 인스턴스를 품지 않고',
  '같은 값을 직접 그렸다. **Button 을 고치면 여기도 손으로 맞춰야 한다.**',
  '',
  'PaginationContent: 가로 gap-1(4px) · PaginationEllipsis: size-9(36px)',
].join('\n');
```

- [ ] **Step 5: 바인딩 검증 + 스크린샷**

페이지 전체 바인딩 누락이 **0을 유지**하는지 확인한다(현재 0이다). 그다음 셋을 눈으로 본다.

- [ ] **Step 6: 커밋할 것이 없음을 확인한다**

```bash
git status --short
```

Expected: 비어 있음.

---

## Task 4: Figma — Progress · ScrollBar · Toast

**Files:** Figma `Components` 페이지.

**Interfaces:**
- Consumes: 없음
- Produces: `Progress`(COMPONENT) · `doc/Progress 예시`(FRAME) · `ScrollBar`(COMPONENT_SET, 2) · `Toast`(COMPONENT_SET, 5)

- [ ] **Step 1: `Progress` 를 단일 컴포넌트로 만든다**

| 레이어 | 값 | 근거 |
|---|---|---|
| 트랙 | 높이 8 (`h-2`), `rounded-full`, `primary` **20%** | `bg-primary/20` |
| `ProgressIndicator` | 높이 100%, `primary` 불투명, 폭은 값 | `bg-primary` |

폭은 240px 로 만들고 인디케이터는 60%(144px)로 둔다.

> **배경 20% 는 paint 불투명도로 준다.** `node.opacity` 를 쓰면 인디케이터까지 흐려진다.
>
> **퍼센트는 데이터지 variant 가 아니다.** 값이 연속이라 variant 로 만들면 끝이 없다.

- [ ] **Step 2: `doc/Progress 예시` 프레임을 만든다**

0 / 33 / 66 / 100 네 개를 세로로 쌓고 각 옆에 숫자 라벨을 둔다. `doc/` 접두사 규칙을 따른다.

> 앱은 `<Progress value={progress} className='h-3' />` 로 **높이를 12px 로 덮어쓴다**(`ReadingGoalProgress.tsx:89`). 기본이 8px 라는 것과 실제 쓰임이 12px 라는 것을 description 에 함께 적는다.

- [ ] **Step 3: `ScrollBar` variant set 2개를 만든다**

`ScrollArea` 루트와 `Viewport` 에는 시각이 없다(`relative`, `size-full rounded-[inherit]`). 그릴 값이 있는 것은 스크롤바뿐이다.

| variant | 트랙 | 썸 |
|---|---|---|
| `vertical` | 폭 10 (`w-2.5`), 높이 120(예시) | `border` 색, `rounded-full`, 폭 10 |
| `horizontal` | 높이 10 (`h-2.5`), 폭 120(예시) | 같음 |

트랙 자체는 투명이고 `border-l-transparent`(세로)/`border-t-transparent`(가로) 라 **테두리를 그리지 않는다**. 썸만 `bg-border` 다.

- [ ] **Step 4: `Toast` variant set 5개를 만든다**

**코드에 `Toast` 컴포넌트는 없다.** `sonner.tsx` 40줄은 전부 설정이고 실제 토스트는 sonner 라이브러리가 그린다. 코드가 정하는 것은 색 4개와 아이콘 5개뿐이다:

```ts
'--normal-bg':     'var(--popover)',
'--normal-text':   'var(--popover-foreground)',
'--normal-border': 'var(--border)',
'--border-radius': 'var(--radius)',
icons: { success, info, warning, error, loading }   // 각 size-4
```

| 속성 | 값 |
|---|---|
| 배경 | `popover` |
| 글자 | `popover-foreground`, 14px |
| 테두리 | 1px `border` |
| radius | `radius` Variable |
| 아이콘 | 16×16 자리표시자, variant 별로 색이 다름 |
| 레이아웃 | 가로, `gap` 12, 패딩 16 (sonner 기본값 근사) |

variant 5: `success`(초록 계열) · `info`(`primary`) · `warning`(주황 계열) · `error`(`destructive`) · `loading`(`muted-foreground`).

> **초록·주황에 대응하는 semantic 토큰이 없다.** primitive 에 `teal/500`·`amber/500`·`orange/600` 이 있으니 **primitive 에 직접 바인딩**하고, 그 사실을 description 과 `note/` 에 적는다. semantic 을 새로 만들지 않는 이유: 이 색들은 sonner 가 그리는 것이라 앱 코드에 대응 토큰이 없고, 라운드 4에서 다크 값을 넣을 때 함께 설계하는 편이 낫다.

- [ ] **Step 5: 셋에 description 을 단다**

`Toast` description 에 **반드시** 넣을 것:

```
코드에 Toast 컴포넌트는 없다. sonner.tsx 의 CSS 변수 매핑을 재현한 것이며,
레이아웃(패딩·간격)은 sonner 라이브러리가 정한다 — 여기서 바꿔도 코드에 반영되지 않는다.
색·radius·아이콘은 코드가 정한 값 그대로다. 15개 중 유일하게 코드와 이름이 다른 컴포넌트다.
```

- [ ] **Step 6: 검증 + 스크린샷**

페이지 전체 바인딩 누락 **0 유지**, 겹침 **0**, 셋을 눈으로 확인.

- [ ] **Step 7: 커밋할 것이 없음을 확인한다**

---

## Task 5: `note/` 갱신 · 완료 기록 · PR

**Files:**
- Figma `note/만들지 않은 것`
- Modify: `docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md`

- [ ] **Step 1: `note/` 에 묶음 4 항목을 추가한다**

```
묶음 4 — 만들지 않은 것 (2026-07-28)

ScrollArea     루트 · Viewport — 시각이 없다(relative, size-full).
               그릴 값이 있는 건 스크롤바뿐이라 ScrollBar 만 만들었다.

Select         Group · ScrollUpButton · ScrollDownButton · Value —
               구조·동작 전용이라 그릴 값이 없다.

Progress       퍼센트별 variant — 값이 연속이라 끝이 없다.
               doc/Progress 예시 프레임에 0/33/66/100 을 그렸다.

Toaster        코드에 있는 건 설정 래퍼뿐이라 그릴 게 없다.
               대신 sonner 가 그리는 토스트를 Toast 로 재현했다
               (15개 중 유일하게 코드와 이름이 다르다).

토큰 없이 둔 것
  Toast 의 success/warning 색은 primitive(teal/amber)에 직접 묶었다.
  sonner 가 그리는 색이라 앱 코드에 대응 semantic 토큰이 없다.
  라운드 4에서 다크 값과 함께 설계한다.
```

추가 후 **겹침 검사**.

- [ ] **Step 2: 스펙에 `### 6.8 묶음 4 완료 기록 (2026-07-28)` 을 추가한다**

`## 7. 완료 기준` **앞에** 넣는다. §6.6·§6.7 과 같은 서식: 만든 것 표 · 검증 결과 표 · 계획과 달라진 것 · 남은 것.

**반드시 포함할 것:**
- `shared/ui` 의 `shadow-xs`·`dark:`·`bg-black`·`font-semibold` 가 **전부 0** 이 됐다는 사실
- Button 인구조사 정정 (묶음 1이 `ghost` 를 놓쳤다) — 원인과 재발 방지(여는 태그 파싱으로 전수)
- 라운드 2 전체 요약: 컴포넌트 21개(Button 세트 12조합 포함), 4묶음

- [ ] **Step 3: 스펙 §7 완료 기준을 대조한다**

7개 항목을 하나씩 실측값과 대조해 표로 적는다. 라운드 2의 종료 판정이다.

- [ ] **Step 4: 커밋**

```bash
git add docs/superpowers/specs/2026-07-28-design-system-round2-batch234-design.md
git commit -m "$(cat <<'EOF'
📝 Docs: 묶음 4 완료 기록 — 라운드 2 종료, shared/ui 07 위반 0

Select · SelectMenu · Pagination · Progress · ScrollBar · Toast 추가.
Button 세트를 12조합으로 보강하고 묶음 1의 인구조사 오류를 정정했다.

shared/ui 의 shadow-xs · dark: · bg-black · font-semibold 가 전부 0이다.
EOF
)"
```

- [ ] **Step 5: 리베이스 후 PR**

```bash
git fetch origin
git rebase origin/main                          # 반드시 먼저
cd apps/page0127 && npm run test && cd ../..    # 남의 변경이 들어왔을 수 있다
git diff --stat origin/main..HEAD               # 내 파일만인지 확인
git push -u origin ds-round2-batch4
```

> **리베이스를 빠뜨리지 않는다.** 묶음 2·3 모두 PR 직전에 `origin/main` 이 움직여 있었다. 묶음 2 때는 하마터면 남의 `uptime.yml` 을 지울 뻔했다.

PR 제목: `✨ Feat: 디자인 시스템 라운드 2 묶음 4 — 마지막 5개 + Button 보강, 07 위반 0 달성`

본문은 묶음 3 PR(#22) 구성을 따르되 **라운드 2 전체 마무리**임을 앞에 적는다. Button 인구조사 정정은 리뷰어가 "왜 갑자기 Button 을?"로 읽지 않도록 근거(조합별 실측 표)를 붙인다.

**로컬 `main` 에 병합하지 않는다.**

---

## 이 계획에서 하지 않는 것

- **`link` variant · `icon-lg` size** — 실사용 0건. 묶음 1 기록 중 유일하게 맞은 항목이다.
- **기존 `destructive / sm` 제거** — 실사용 0건이지만 세트에서 빼면 참조 인스턴스가 깨진다. 남기는 비용이 없다.
- **`user-avatar.tsx:98` 의 `text-white`** — 닉네임별 생성 색 위의 모노그램이라 대응 토큰이 없다.
- **Toast 의 success/warning 을 semantic 토큰으로 승격** — 라운드 4에서 다크 값과 함께 설계한다.
- **라운드 3(도메인 컴포넌트)·라운드 4(다크모드)** — 별도 라운드.

---

## 참고

- 스펙: `2026-07-28-design-system-round2-batch234-design.md` §4.4(묶음 4 구조) · §6.6·§6.7(묶음 2·3 완료 기록과 함정)
- 묶음 1: `2026-07-27-design-system-round2-components-design.md` §6.3(상태 배치 기준) · §7(description 방식)
- 07 원칙: `00_docs/07_리디자인_진단_및_실행안.md` §2.2 타이포 · §2.3 그림자
