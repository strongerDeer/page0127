# 디자인 시스템 라운드 2 묶음 1 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용량 상위 5개(`button` `card` `skeleton` `input` `alert-dialog`)를 07 원칙에 맞게 정리하고, Figma 컴포넌트로 만들어 라운드 1의 Variables에 바인딩한다.

**Architecture:** 코드에서 07 원칙에 어긋나는 클래스(`shadow-xs`·`dark:`)를 먼저 걷어낸 뒤, MCP `use_figma` 스크립트로 Figma `Components` 페이지에 컴포넌트를 생성한다. 모든 색·간격·radius는 하드코딩하지 않고 `Semantic`/`Primitives` 컬렉션의 Variable에 바인딩한다.

**Tech Stack:** Tailwind v4, MCP `use_figma`(Figma Plugin API), Playwright(시각 실측), vitest

**설계 문서:** `docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md`

## Global Constraints

- **커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 절대 넣지 않는다.** (`CLAUDE.md` 6번)
- **Figma 컴포넌트의 색·간격·radius는 반드시 Variable 바인딩.** 하드코딩 hex 금지 — 라운드 4 다크모드가 이것에 의존한다.
- **코드에 없는 variant를 Figma에 만들지 않는다.** 방향은 "코드 → Figma 미러"다.
- `Semantic` 컬렉션 ID: `VariableCollectionId:13:2` / `Primitives`: `VariableCollectionId:12:2`
- Figma 파일 키: `5ErSDsG1MNfvexSDZ2PfLS`
- **MCP `use_figma` 호출 전 반드시 `figma-use` 스킬을 읽는다.** `skillNames` 파라미터에 `resource:figma-use` 를 넣는다.
- 텍스트 노드를 만들 때 폰트는 `Pretendard`(Regular/Medium/Bold). **`loadFontAsync` 를 먼저 `await` 한다.**
- **문서용 노드(라벨·설명·메모)는 이름을 `doc/…` 또는 `note/…` 로 시작한다.** Task 5의 바인딩 검사가 이 규칙으로 걸러낸다 — 설명 텍스트는 컴포넌트가 아니라 토큰에 묶을 이유가 없다.
- 테스트 파일은 `.test.ts` (vitest). 기존 4종 테스트가 계속 통과해야 한다.

---

## 계획서의 정정 두 가지

착수 전 실제 파일을 읽고 스펙의 두 곳을 정정한다.

| 스펙 기술 | 실제 |
|---|---|
| `button`의 `dark:` **4개** | **7개** (아래 Task 1에 전부 나열) |
| `card`는 "정리 불필요" | 맞다 — 그런데 **`CardTitle`의 `font-semibold`(600)가 07 스케일(400/500/700) 밖**이다 |

`CardTitle` 건은 Task 3에서 다룬다. 이번 라운드에서 **코드를 고치지 않고 Figma에 600 그대로 반영**하되 부채로 기록한다 — 스펙 §3 결정 1의 "코드 정리"는 `shadow`·`dark:`를 대상으로 합의한 것이고 weight는 논의되지 않았기 때문이다. 범위를 임의로 넓히지 않는다.

---

## 누가 무엇을 하는가

| 태스크 | 실행 주체 | 이유 |
|---|---|---|
| Task 1 (코드 정리) | 서브에이전트 | 파일 2개 수정 + 테스트. 독립적으로 리뷰 가능 |
| Task 2~5 (Figma) | **컨트롤러 직접** | 스크립트 실행 → 스크린샷 확인 → 조정의 반복이라 왕복이 잦다. 라운드 1에서도 같은 이유로 직접 수행했다 |

---

## File Structure

**수정**

| 파일 | 변경 |
|---|---|
| `apps/page0127/src/shared/ui/button.tsx` | `shadow-xs` 1개, `dark:` 7개 제거 |
| `apps/page0127/src/shared/ui/input.tsx` | `shadow-xs` 1개, `dark:` 2개 제거 |

**Figma** (파일 없음)

| 대상 | 내용 |
|---|---|
| `Components` 페이지 | 신규 생성 |
| Button variant set | `variant 3 × size 2 = 6` |
| Card 슬롯 | `Card` + 하위 6종 |
| Skeleton · Input · AlertDialog | 각 1세트 |

---

## Task 1: 코드에서 07 원칙 위반 클래스를 걷어낸다

**Files:**
- Modify: `apps/page0127/src/shared/ui/button.tsx`
- Modify: `apps/page0127/src/shared/ui/input.tsx`

**Interfaces:**
- Produces: 정리된 두 컴포넌트. Task 2·4가 이 클래스 목록을 Figma 값의 근거로 쓴다.

---

- [ ] **Step 1: `button.tsx`의 base 문자열에서 `dark:` 하나를 뺀다**

7행에서 시작하는 `cva()` 첫 인자다. 변경 전 (끝부분):

```
aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive
```

변경 후:

```
aria-invalid:ring-destructive/20 aria-invalid:border-destructive
```

- [ ] **Step 2: `variant` 세 개를 고친다**

변경 전:

```ts
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
```

변경 후:

```ts
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        // 07 §2.3 — 그림자는 실제로 떠 있는 것에만. outline 버튼은 표면에 붙어 있고
        // border 가 이미 경계를 만들므로 shadow-xs 를 뺐다.
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
```

> `dark:` 를 지우는 이유: 라운드 4 다크모드는 `--card` 같은 **토큰 값을 모드별로 바꾸는** 방식이라(라운드 1 설계 §3.3) 유틸리티 클래스가 필요 없고, 남아 있으면 토큰 값을 덮어써 충돌한다.

- [ ] **Step 3: `dark:` 가 하나도 안 남았는지 확인한다**

Run:
```bash
grep -c "dark:" apps/page0127/src/shared/ui/button.tsx
```
Expected: `0`

- [ ] **Step 4: `input.tsx`를 고친다**

11행의 긴 className 문자열에서 두 곳, 13행에서 한 곳이다.

변경 전 (11행 중 해당 부분):
```
selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow]
```
변경 후:
```
selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow]
```

변경 전 (13행):
```ts
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
```
변경 후:
```ts
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
```

> **건드리지 말 것:** `text-base md:text-sm`(모바일 16px / 데스크톱 14px)은 **iOS가 16px 미만 입력에서 화면을 자동 확대하는 것을 막는 관례**다. 07 타이포 스케일과 무관하며 바꾸면 모바일이 확대된다. `focus-visible:` 3개도 그대로 둔다.

- [ ] **Step 5: 두 파일 모두 `shadow`·`dark:` 가 없는지 확인한다**

Run:
```bash
grep -c "dark:\|shadow-" apps/page0127/src/shared/ui/button.tsx apps/page0127/src/shared/ui/input.tsx
```
Expected: 두 파일 모두 `0`

> **실행 중 확인:** `button.tsx` 는 **1** 이 나온다. Step 2 가 지시한 주석에 "shadow-xs" 라는 문자열이 들어 있기 때문이며 실제 클래스는 아니다(`input.tsx` 는 0). 묶음 2~4 에서 같은 grep 을 재사용할 때는 주석을 제외하거나 기대값을 조정할 것.

- [ ] **Step 6: 테스트·lint·타입체크를 돌린다**

Run:
```bash
npm run test && npm run lint && npm run type-check
```
Expected: 전부 통과 (page0127 92 · design-tokens 4 · quality 58)

> `token-usage.test.ts` 가 통과하는 것이 정상이다. `dark:bg-input/30` 이 사라지면서 `--input` 사용처가 줄지만, 이 테스트는 "쓰는데 정의가 없는 것"을 잡지 그 반대는 아니다.

- [ ] **Step 7: 개발 서버를 띄우고 실측한다**

**dev 서버를 백그라운드로 띄우되, 검증이 끝나면 반드시 종료한다.**

```bash
npm run dev --workspace page0127 -- --port 3100
```

`http://localhost:3100/` 에서 Playwright 로 아래를 확인한다 (라운드 1에서 줄간격을 실측한 것과 같은 방식):

```js
() => {
  const btn = document.querySelector('button');
  const s = getComputedStyle(btn);
  return {
    boxShadow: s.boxShadow,          // 'none' 이어야 한다
    backgroundColor: s.backgroundColor,
    borderColor: s.borderColor,
  };
}
```

확인 항목:
- 모든 버튼의 `box-shadow` 가 `none`
- outline 버튼이 있다면 `border-color` 가 `rgb(223, 227, 232)`(`#dfe3e8` = `--line`)
- `input` 이 있는 화면에서 `box-shadow: none` 이고 `border` 는 살아 있음

**서버 종료를 잊지 말 것.**

- [ ] **Step 8: 커밋**

```bash
git add apps/page0127/src/shared/ui/button.tsx apps/page0127/src/shared/ui/input.tsx
git commit -m "style(ui): button·input 에서 07 원칙에 어긋나는 클래스를 걷어낸다

shadow-xs 는 07 §2.3 위반이다 — 그림자는 실제로 떠 있는 것(모달·드롭다운·
토스트)에만 쓴다. 버튼과 입력 필드는 표면에 붙어 있고 border 가 이미
경계를 만든다.

dark: 클래스 9개(button 7 · input 2)는 죽은 코드다. 다크모드가 없을 뿐
아니라, 라운드 4 에서 도입할 방식이 shadcn 의 유틸리티가 아니라 토큰 값을
모드별로 바꾸는 것이라 앞으로도 쓰지 않는다. 남겨두면 그때 토큰 값을
덮어써 충돌한다.

text-base md:text-sm 은 iOS 자동 확대 방지 관례라 건드리지 않았다."
```

---

## Task 2: Figma — `Components` 페이지와 Button

**Files:** 없음 (Figma 파일 작업, 컨트롤러 직접 수행)

**Interfaces:**
- Consumes: Task 1의 정리된 `button.tsx` 클래스
- Produces: `Components` 페이지, `Button` variant set 6개. Task 3~5가 같은 페이지에 이어 붙인다.

---

- [ ] **Step 1: `Components` 페이지를 만든다**

`Foundations` 페이지는 그대로 두고 새 페이지를 추가한다. `figma.createPage()` 는 Design 파일에서만 동작한다(이 파일은 `/design/` 이므로 가능).

- [ ] **Step 2: Button 6개의 값을 확정한다**

Tailwind 클래스를 px 로 환산한 값이다. **이 표가 Figma 값의 유일한 근거다.**

| | default | sm |
|---|---|---|
| 높이 | `h-9` = **36px** | `h-8` = **32px** |
| 좌우 패딩 | `px-4` = **16px** | `px-3` = **12px** |
| 아이콘 간격 | `gap-2` = **8px** | `gap-1.5` = **6px** |
| radius | `rounded-md` = **6px** (`corner/md`) | 동일 |
| 폰트 | `text-sm` **14px** / `font-medium` **500** | 동일 |

variant 3종의 색 (전부 Variable 바인딩):

| variant | 배경 | 글자 | 보더 |
|---|---|---|---|
| `default` | `Semantic/primary` | `Semantic/primary-foreground` | 없음 |
| `outline` | `Semantic/background` | `Semantic/text/strong` | 1px `Semantic/line` |
| `destructive` | `Semantic/destructive` | `Semantic/primary-foreground`(흰색) | 없음 |

> `outline` 의 글자색이 `text/strong` 인 이유: 코드에는 글자색 지정이 없어 부모의 `--foreground` 를 상속하는데, 그 값이 `text/strong` 이다(라운드 1 설계 §7.2).

- [ ] **Step 3: variant set 6개를 만든다**

각 버튼은 `figma.createAutoLayout('HORIZONTAL')` 로 만들고 위 표대로 패딩·gap·radius·색을 바인딩한다. 6개를 `figma.combineAsVariants()` 로 묶는다.

Property 이름은 코드와 같게: `variant`(default/outline/destructive), `size`(default/sm).

- [ ] **Step 4: 각 variant 에 description 을 단다**

정식 Code Connect 를 못 쓰는 대신이다(설계 §7). 예:

```
@/shared/ui/button — <Button>
41곳 중 39곳이 이 기본형이다 (variant·size 를 명시하지 않는다)
hover: bg-primary/90
```

`outline` 에는 아래를 덧붙인다:
```
07 §2.1 — 채워진 버튼은 화면당 최대 1개. 나머지는 이 형태를 쓴다.
shadow 없음: 표면에 붙어 있으므로 border 만으로 경계를 만든다 (07 §2.3)
```

- [ ] **Step 5: 상태 문서 프레임을 그린다**

variant 로 만들지 않는 hover·focus·disabled 를 표로 남긴다(설계 §6.3). 실제 버튼 모양을 그리고 라벨을 붙인다.

| 상태 | default | outline | destructive |
|---|---|---|---|
| hover | `primary` 90% | 배경 `accent`, 글자 `accent-foreground` | `destructive` 90% |
| focus-visible | 보더 `ring`, 링 `ring` 50% 3px | 동일 | 동일 |
| disabled | 불투명도 50%, 포인터 없음 | 동일 | 동일 |

프레임 상단에 **"이 상태들은 variant 가 아니다 — 화면에 배치할 일이 없어 문서로만 남긴다"** 를 적는다.

- [ ] **Step 6: 만들지 않은 것을 기록한다**

같은 페이지에 짧은 메모 프레임을 둔다. 나중에 "왜 ghost 가 없지?" 를 다시 조사하지 않도록:

```
만들지 않은 variant — ghost · link · secondary
코드에 정의는 있으나 앱에서 쓰인 적이 없다.

만들지 않은 size — icon · icon-sm · icon-lg
아이콘 전용 버튼이 앱에 0곳이다.

필요해지면 코드와 Figma 에 함께 추가한다.
```

- [ ] **Step 7: 스크린샷으로 확인한다**

`await frame.screenshot()` 으로 6개 variant 와 상태표가 제대로 그려졌는지 본다. 텍스트가 잘리거나 겹치면 고친 뒤 다음 태스크로 간다.

---

## Task 3: Figma — Card 슬롯 구조와 Skeleton

**Files:** 없음 (Figma 파일 작업, 컨트롤러 직접 수행)

**Interfaces:**
- Consumes: Task 2의 `Components` 페이지
- Produces: `Card` 슬롯 컴포넌트 7종, `Skeleton` 1종

---

- [ ] **Step 1: Card 의 값을 확정한다**

`card.tsx` 실측값이다. **`card` 는 이미 07 원칙을 지키고 있어 코드 수정이 없다** — `shadow` 없이 `border-line-soft` 를 쓰고, 그 이유가 주석으로 달려 있다.

| 조각 | 값 |
|---|---|
| `Card` | 배경 `Semantic/card`, 보더 1px `Semantic/line-soft`, radius `rounded-xl` = **12px**(`corner/xl`), 세로 패딩 **20px**(`py-5`), 자식 간격 **20px**(`gap-5`) |
| `CardHeader` | 좌우 패딩 **24px**(`px-6`), 자식 간격 **8px**(`gap-2`) |
| `CardTitle` | `leading-none`, **`font-semibold` = 600** |
| `CardDescription` | 글자 `Semantic/muted-foreground`, `text-sm` **14px** |
| `CardContent` | 좌우 패딩 **24px** |
| `CardFooter` | 좌우 패딩 **24px**, 가로 배치 + 세로 중앙 |
| `CardAction` | 헤더 오른쪽 상단에 배치되는 슬롯 |

- [ ] **Step 2: `CardTitle` 의 weight 불일치를 기록한다**

`font-semibold`(600)는 **07 타이포 3단계(400/500/700) 밖**이다. 이번 라운드에서는 **코드 그대로 600으로 만들고** description 에 적는다:

```
⚠️ font-semibold(600) — 07 §2.2 의 weight 3단계(400/500/700) 밖이다.
이번 라운드는 shadow·dark: 만 정리하기로 합의해 코드를 건드리지 않았다.
500(body) 또는 700(heading) 중 무엇으로 맞출지는 별도 판단이 필요하다.
```

**임의로 500이나 700으로 바꾸지 않는다.** 미러 원칙(코드에 있는 것을 그대로)이 우선이고, 시각 결정은 사람이 한다.

- [ ] **Step 3: Card 를 슬롯 구조로 만든다**

variant 가 없으므로 variant set 이 아니라 **개별 컴포넌트 7개**로 만든다. `Card` 는 auto-layout 세로 컨테이너이고 나머지가 그 안에 들어간다.

조립 예시를 하나 만들어 옆에 둔다 — 제목 + 설명 + 본문 + 액션이 있는 실제 카드 형태.

- [ ] **Step 4: Skeleton 을 만든다**

`skeleton.tsx` 전문이 이것뿐이다:
```
bg-line-soft animate-pulse rounded-md
```

| 값 | |
|---|---|
| 배경 | `Semantic/line-soft` |
| radius | `rounded-md` = **6px** (`corner/md`) |
| 크기 | 고정 없음 — 쓰는 쪽이 정한다 |

애니메이션(`animate-pulse`)은 Figma 컴포넌트로 표현하지 않는다. description 에 "`animate-pulse` — 1.5초 주기 투명도 왕복" 이라고 적는다.

컴포넌트 하나 + 사용 예시(제목 줄·본문 줄·썸네일 형태 3개)를 옆에 그린다.

- [ ] **Step 5: 스크린샷으로 확인한다**

Card 조립 예시가 실제 카드처럼 보이는지, Skeleton 예시가 로딩 상태로 읽히는지 본다.

---

## Task 4: Figma — Input 상태와 AlertDialog

**Files:** 없음 (Figma 파일 작업, 컨트롤러 직접 수행)

**Interfaces:**
- Consumes: Task 2의 `Components` 페이지, Task 1의 정리된 `input.tsx`
- Produces: `Input` variant set 4개(상태), `AlertDialog` 구조

---

- [ ] **Step 1: Input 4상태의 값을 확정한다**

Task 1 정리 후 기준이다.

| 공통 | 값 |
|---|---|
| 높이 | `h-9` = **36px** |
| 좌우 패딩 | `px-3` = **12px** |
| radius | `rounded-md` = **6px** (`corner/md`) |
| 배경 | 투명 (`bg-transparent`) — Figma 에서는 `Semantic/background` 로 둔다 |
| 폰트 | **14px**(데스크톱 기준 `md:text-sm`) |
| placeholder 색 | `Semantic/muted-foreground` |

| 상태 | 보더 | 링 |
|---|---|---|
| `default` | 1px `Semantic/input` | 없음 |
| `focus` | 1px `Semantic/ring` | 3px `Semantic/ring` 50% 불투명도 |
| `error` | 1px `Semantic/destructive` | 3px `Semantic/destructive` 20% 불투명도 |
| `disabled` | 1px `Semantic/input`, 전체 불투명도 50% | 없음 |

- [ ] **Step 2: variant set 4개를 만든다**

Property 이름은 `state`(default/focus/error/disabled). **Button 과 달리 상태를 variant 로 만드는 이유**를 description 에 적는다:

```
@/shared/ui/input — <Input>
상태를 variant 로 둔 이유: 폼 디자인에서는 에러 상태를 실제로 화면에 배치한다.
(Button 은 hover 상태를 배치할 일이 없어 문서 프레임에만 남겼다)

error 는 코드에서 aria-invalid 속성으로 표현된다 — 별도 prop 이 아니다.
```

- [ ] **Step 3: AlertDialog 의 값을 확정한다**

`alert-dialog.tsx` 실측값이다.

| 조각 | 값 |
|---|---|
| Overlay | 검정 50% 불투명도 |
| Content | 배경 `Semantic/background`, radius `rounded-lg` = **8px**(`corner/lg`), 패딩 **24px**(`p-6`), 자식 간격 **16px**(`gap-4`), 최대 너비 **512px**(`sm:max-w-lg`), 보더 1px `Semantic/border` |
| Header | 세로 배치, 간격 **8px**(`gap-2`) |
| Footer | 가로 배치, 오른쪽 정렬, 간격 **8px** |
| **그림자** | **`shadow-lg` 유지** |

- [ ] **Step 4: 그림자가 유지되는 이유를 남긴다**

묶음 1에서 그림자가 살아남는 유일한 컴포넌트다. Content 의 description 에:

```
shadow-lg 유지 — 07 §2.3 의 예외다.
"그림자는 실제로 떠 있어야 하는 것에만 — 드롭다운·모달·토스트·sticky 헤더"
AlertDialog 는 오버레이 위에 실제로 떠 있으므로 그림자가 정당하다.
같은 이유로 button·input 에서는 shadow-xs 를 걷어냈다.
```

- [ ] **Step 5: 조립 예시를 만든다**

실제 삭제 확인 다이얼로그 형태로 하나 그린다 — 제목("정말 삭제할까요?") + 설명 + `outline` 버튼(취소) + `destructive` 버튼(삭제). **Task 2에서 만든 Button 인스턴스를 쓴다.**

- [ ] **Step 6: 스크린샷으로 확인한다**

Input 4상태가 서로 구분되는지(특히 focus 와 error 의 링 색), AlertDialog 가 떠 있는 것처럼 보이는지 본다.

---

## Task 5: 바인딩 검증과 마무리

**Files:**
- Modify: `docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md` (완료 기록)

**Interfaces:**
- Consumes: Task 2~4가 만든 모든 Figma 컴포넌트

---

- [ ] **Step 1: 하드코딩된 색이 없는지 스크립트로 검사한다**

`Components` 페이지의 모든 노드를 훑어 `fills`·`strokes` 가 Variable 에 바인딩됐는지 확인한다. 라운드 1에서 Semantic 46개의 alias 를 전수 검증한 것과 같은 방법이다.

```js
const page = figma.root.children.find((p) => p.name === 'Components');
await figma.setCurrentPageAsync(page);

// 문서용 라벨 텍스트는 검사 대상이 아니다 — 컴포넌트가 아니라 설명이라
// 토큰에 묶을 이유가 없다. 이름 규칙으로 걸러낸다.
const isDocLabel = (n) => n.name.startsWith('doc/') || n.name.startsWith('note/');

const unbound = [];
const check = (node, paints, kind) => {
  if (!Array.isArray(paints)) return;
  for (const p of paints) {
    if (p.type !== 'SOLID') continue;
    if (p.boundVariables && p.boundVariables.color) continue;
    unbound.push(`${node.name} (${kind})`);
  }
};

for (const node of page.findAll((n) => !isDocLabel(n))) {
  if ('fills' in node) check(node, node.fills, 'fill');
  if ('strokes' in node) check(node, node.strokes, 'stroke');
}

return {
  unboundCount: unbound.length,
  unbound: [...new Set(unbound)].slice(0, 30),
};
```

> 문서용 텍스트를 만들 때 이름을 `doc/…` 또는 `note/…` 로 시작하게 하면 이 검사에서 자동으로 빠진다. Task 2~4에서 상태표·메모 프레임의 텍스트에 이 규칙을 적용한다.

Expected: `unboundCount: 0`

**0이 아니면 그 노드를 고친 뒤 다시 돌린다.** 문서용 라벨 텍스트처럼 의도적으로 바인딩하지 않은 것이 있으면 목록에 남기고 이유를 적는다.

- [ ] **Step 2: 컴포넌트 개수를 확인한다**

```js
const page = figma.root.children.find((p) => p.name === 'Components');
await figma.setCurrentPageAsync(page);
const sets = page.findAllWithCriteria({ types: ['COMPONENT_SET'] });
const comps = page.findAllWithCriteria({ types: ['COMPONENT'] });
return {
  componentSets: sets.map((s) => ({ name: s.name, variants: s.children.length })),
  standaloneComponents: comps.filter((c) => c.parent.type !== 'COMPONENT_SET').map((c) => c.name),
};
```

Expected:
- `Button` variant set — 6
- `Input` variant set — 4
- 단독 컴포넌트 — `Card` 계열 7종, `Skeleton`, `AlertDialog` 계열

- [ ] **Step 3: 코드 테스트가 여전히 통과하는지 확인한다**

Run:
```bash
npm run test && npm run lint && npm run type-check
```
Expected: 전부 통과

- [ ] **Step 4: 설계 문서에 완료를 기록한다**

`docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md` 의 §4.2 묶음 표에서 묶음 1 줄에 완료 표시를 하고, 아래를 §9 위에 추가한다:

```markdown
## 8.4 묶음 1 완료 기록 (2026-XX-XX)

- 코드 정리: `button`(shadow-xs 1 · dark: 7), `input`(shadow-xs 1 · dark: 2)
- Figma: Button 6 variant, Input 4 state, Card 슬롯 7종, Skeleton, AlertDialog
- 바인딩 검증: 하드코딩 색 0건
- 발견: `CardTitle` 의 `font-semibold`(600)가 07 weight 3단계 밖 — 별도 판단 필요
```

- [ ] **Step 5: 커밋**

```bash
git add docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md
git commit -m "docs(spec): 라운드 2 묶음 1 완료 기록"
```

---

## 완료 기준

- [ ] `button.tsx`·`input.tsx` 에 `dark:` 와 `shadow-` 가 0건
- [ ] Playwright 실측으로 버튼·입력의 `box-shadow` 가 `none`, outline 보더가 `--line`
- [ ] 코드 테스트 4종 전부 통과
- [ ] Figma `Components` 페이지에 Button 6 · Input 4 · Card 7 · Skeleton · AlertDialog 존재
- [ ] **하드코딩된 색 0건** (전부 Variable 바인딩)
- [ ] 만들지 않은 variant 의 이유가 Figma 에 기록됨
- [ ] `CardTitle` weight 불일치가 기록됨

---

## 묶음 2로 넘기는 것

이 묶음에서 정해진 패턴이 나머지 15개에 그대로 적용된다:

- **상태를 variant 로 둘지 문서로 둘지** — 기준은 "화면에 배치할 일이 있는가"
- **description 에 코드 정보를 적는 형식** — 경로 + 사용 빈도 + 특이사항
- **만들지 않은 것을 기록하는 습관**
- **Variable 바인딩 필수** 및 그 검증 스크립트
