# 디자인 시스템 라운드 2 — 컴포넌트 묶음 2·3·4 설계

- 작성일: 2026-07-28
- 범위: `shared/ui` 남은 15개를 Figma 컴포넌트로. **스펙은 세 묶음을 함께, 실행은 묶음별로 끊는다.**
- 선행: [묶음 1](2026-07-27-design-system-round2-components-design.md) · [타이포 스케일 재검토](2026-07-28-typography-scale-revision-design.md)
- Figma 파일: `page0127` (`5ErSDsG1MNfvexSDZ2PfLS`)

---

## 0. 한 줄 요약

묶음 1에서 정해진 패턴(상태를 variant에 담을지 문서에 담을지, 토큰 바인딩 필수, description으로 Code Connect 대체)을 나머지 15개에 그대로 적용한다. **묶음 4가 끝나면 `shared/ui` 전체에서 `shadow-xs`·`dark:`·`bg-black`이 0이 된다.**

---

## 1. 착수 전 감사 — 남은 위반의 전부

묶음 1 스펙 §8.5③이 *"묶음 2~4에서는 07 스케일 밖 클래스를 grep 하는 절차를 넣는다"*고 남겼다. 그 감사를 착수 전에 전수로 돌렸다.

### 1.1 07 위반 전수 (주석 줄 제외)

`dark:`는 **줄 수와 출현 수가 다르다** — 한 줄짜리 긴 `className`에 여러 개가 몰려 있다. 검증 grep은 줄로 세므로(`wc -l`) 두 값을 함께 적는다.

| 묶음 | 파일 | `shadow-xs` | `dark:` 줄 | `dark:` 출현 | 기타 |
|---|---|---:|---:|---:|---|
| **2** | `textarea` | 1 | 1 | 2 | |
| **2** | `dialog` | 0 | 0 | 0 | `bg-black/50` 1 |
| **3** | `switch` | 1 | 2 | 3 | |
| **3** | `badge` | 0 | 2 | 3 | |
| **3** | `dropdown-menu` | 0 | 1 | 1 | |
| **4** | `select` | 1 | 1 | 3 | |
| | **합계** | **3** | **7** | **12** | **1** |

`popover` · `scroll-area` · `progress` · `pagination` · `sonner` · `avatar` · `label` · `ErrorFallback` — **위반 0**. 코드를 건드리지 않고 Figma에만 올린다.

`bg-black`은 **앱 전체에 `dialog.tsx:39` 한 곳만** 남았다. 묶음 1이 만든 `overlay` 토큰의 마지막 소비처다.

### 1.2 유지되는 그림자 (07 §2.3 예외)

떠 있는 것에만 그림자를 둔다는 원칙에 따라 **그대로 둔다**: `dialog` `shadow-lg`, `popover` `shadow-md`, `dropdown-menu` `shadow-lg`·`shadow-md`, `select` `shadow-md`, `alert-dialog` `shadow-lg`.

### 1.3 타이포 — 산문 위반은 정확히 하나였다

타이포 재검토(2026-07-28)로 `font-semibold`는 **0건**이 됐다. 남은 검사는 크기다.

| 위치 | 클래스 | 내용 | 판정 |
|---|---|---|---|
| `ReadingProgressOverview.tsx:86` | `text-2xl … sm:text-3xl` | `{headline}` — **산문 h2** | ❌ 30px는 스케일 밖 |
| `ReadingJourneyCard.tsx:45` | `text-4xl` | `totalBooks.toLocaleString()` | ✅ `stat` |
| `ReadingProgressOverview.tsx:112` | `text-4xl` | `hasGoal ? progress : completed` | ✅ `stat` |
| `RatingDoughnutChart.tsx:52` | `text-4xl` | `averageRating.toFixed(1)` | ✅ `stat` |
| `CompatibilityView.tsx:308` | `text-6xl` | `compatibility_score` | ✅ `stat` |

> 다섯 곳 모두 **줄 번호만 보지 않고 내용을 열어 확인**했다. 묶음 1 조사에서 `PublicLibraryHeader.tsx:150`을 `text-3xl`로 잘못 인용한 것이 그 절차를 건너뛴 탓이었다.

---

## 2. 인계 항목 — 새 값을 만들 필요가 없었다

묶음 1이 *"`ReadingProgressOverview.tsx:86`이 07 최대치(28px)를 넘는다"*를 인계했다. 30px를 스케일에 넣을지, 코드를 28px로 줄일지가 숙제였는데 **셋째 답이 있었다.**

`globals.css:134`의 `.heading-1` 유틸이 이미 07 스케일 그 자체다.

| | 모바일 | 데스크톱 | weight |
|---|---|---|---|
| `.heading-1` | `--font-h1-mobile` 24px / 34 | `--font-h1-desktop` **28px** / 40 | 700 |
| 07 §2.2 | `display-sm` 24/34 700 | `display` 28/40 700 | |

값이 완전히 일치한다. 그리고 **24개 파일이 이미 `.heading-1`/`.heading-2`를 쓴다** — `ReadingProgressOverview`만 혼자 손으로 `text-2xl sm:text-3xl font-bold`를 썼고, 그 손으로 쓴 값이 스케일 밖이었다.

```diff
- className='mt-3 break-keep text-2xl font-bold tracking-tight text-text-strong sm:text-3xl'
+ className='heading-1 mt-3 break-keep tracking-tight text-text-strong'
```

**새 토큰도, 새 Tailwind 단계도 필요 없다.** 다수가 쓰는 유틸로 되돌리는 것이 전부다. `tracking-tight`·`break-keep`·`text-text-strong`·`mt-3`은 유지한다(유틸은 크기·줄간격·weight만 정한다).

> 이것이 *"스케일 밖이면 고친다"* 규칙의 첫 적용이고, **규칙이 코드를 바꾸는 게 아니라 이미 있던 규칙으로 되돌리는 결과**가 나왔다.

---

## 3. 묶음과 순서

사용량이 아니라 **성격**으로 묶는다. 묶음 1이 사용량 상위 5개를 이미 걷어갔고, 남은 15개는 사용량이 1~2로 평평해 순서를 정하는 근거가 되지 못한다.

| 묶음 | 컴포넌트 | 성격 |
|---|---|---|
| **2** | `Textarea` `Dialog` `Avatar` `Label` `ReadCountBadge` | 묶음 1과 동형(폼 입력·모달·뱃지) — 패턴을 그대로 재사용 |
| **3** | `Popover` `DropdownMenu` `Badge` `Switch` `ErrorFallback` | 떠 있는 것 + variant 다수 |
| **4** | `Select` `Pagination` `Progress` `ScrollBar` `Toast` | 복합·판단이 갈린 것 |

각 묶음은 독립적으로 완결된다 — 앞 묶음이 만든 컴포넌트를 뒤 묶음이 인스턴스로 품지 않는다(Figma 인스턴스에 자식을 못 넣는 제약, 묶음 1 §8.5①).

---

## 4. Figma 컴포넌트 구조

### 4.1 상태를 어디에 담는가 — 기준은 그대로

묶음 1 §6.3의 기준: **"그 상태를 화면에 배치할 일이 있는가."** 배치할 일이 있으면 variant, 없으면 `doc/` 문서 프레임에 상태표.

### 4.2 묶음 2

**`Textarea` — state 4 variant**
`default` / `focus` / `error` / `disabled`. `Input`과 완전히 같은 4상태이고, 폼 디자인에서 에러 상태를 실제로 배치한다.
`min-h-16` `px-3 py-2` `rounded-md` `border` `bg-transparent`, 텍스트 16px(모바일)/14px(`md:` 이상).

**`Dialog` — 슬롯형 단일**
`AlertDialog`와 동형이라 그 구조를 재사용한다. 레이어 이름을 코드 슬롯명과 1:1로 맞춘다.

```
Dialog
├ DialogOverlay      ← bg-overlay (이번에 바뀜)
└ DialogContent      ← rounded-lg / border / p-6 / gap-4 / shadow-lg / max-w-lg
  ├ DialogHeader
  │ ├ DialogTitle        ← 18px / 500 (타이포 재검토로 이미 정합)
  │ └ DialogDescription
  ├ (content slot)
  ├ DialogFooter
  └ DialogClose
```

**`Avatar` — variant 2**
`image` / `fallback`. 코드가 이미지 유무로 갈라 렌더하고, 화면 디자인에서 **둘 다 배치한다**(프로필 미설정 사용자를 그려야 한다). `size-8`(32px) `rounded-full`, fallback은 `bg-muted`.

**`Label` — variant 2**
`default` / `disabled`. 14px / 500 / `gap-2`.

> **함정을 description에 적는다.** 코드는 `peer-disabled:opacity-50` — **형제 input이 disabled일 때 자동으로** 흐려진다. Figma에서 variant로 보이면 "Label에 disabled prop을 주면 되겠다"로 읽히므로, description에 *"직접 지정하는 prop이 아니다. 형제 input의 disabled가 결정한다"*를 명시한다.

**`ReadCountBadge` — size 3 variant**
`sm`(`px-2 py-0.5` 12px) / `md`(`px-2.5 py-1` 14px) / `lg`(`px-3 py-1.5` 16px). `bg-primary/15` `text-primary` `font-medium` `rounded-full` + 책 아이콘.

> **`note/` 로 기록할 것:** `readCount <= 1`이면 컴포넌트가 `null`을 반환한다. "없음"은 Figma에 만들 수 없다.

### 4.3 묶음 3

**`Popover` — 슬롯형 단일**
`Content`: `w-72` `p-4` `rounded-md` `border` `bg-popover` `shadow-md` `z-50`.

**`DropdownMenu` — Content 슬롯 + `DropdownMenuItem` 별도(state 3)**
export 15개 중 **그릴 값이 있는 것만** 만든다.

- 만든다: `DropdownMenuContent`(슬롯) · `DropdownMenuItem`(`default`/`hover`/`disabled`) · `DropdownMenuLabel` · `DropdownMenuSeparator` · `DropdownMenuShortcut` · `DropdownMenuCheckboxItem` · `DropdownMenuRadioItem`
- 만들지 않는다: `DropdownMenuPortal` · `Group` · `RadioGroup` · `Sub` · `SubTrigger` · `SubContent` · `Trigger` — 구조·동작 전용이라 시각이 없다

`Item`을 별도 컴포넌트로 빼는 이유는 **hover 상태를 배치할 일이 있어서**다. 메뉴를 그릴 때 "지금 어느 항목 위에 있는가"를 보여주는 시안이 흔하다. Button의 hover와 갈리는 지점이다.

**`Badge` — variant 4**
`default` / `secondary` / `destructive` / `outline`. 공통: `rounded-full` `border` `px-2 py-0.5` `text-xs` `font-medium` `gap-1`, 아이콘 `size-3`.

**`Switch` — variant 2**
`checked` / `unchecked`. 트랙 `h-[1.15rem]`(≈18.4px) `w-8` `rounded-full`, 썸 `size-4` `rounded-full`. checked는 `bg-primary`, unchecked는 `bg-input`.

> `h-[1.15rem]`은 임의값(arbitrary value)이라 대응 토큰이 없다. **크기는 그대로 두고**(시각 변경은 이번 범위가 아니다) `note/`에 *"토큰화 후보"*로 남긴다.

**`ErrorFallback` — 단일 완성형**
`Card` + `CardHeader` + `CardTitle` + `CardContent` + `Button` 조합이다. 슬롯 없이 완성된 형태 하나로 만든다 — 이 컴포넌트는 조립 대상이 아니라 그 자체가 화면이다. `bg-destructive` `text-destructive` `rounded-md` `p-3`/`p-4` `gap-2`.

### 4.4 묶음 4 — 셋을 다르게 판단했다

**`Select` — Trigger state 4 + Content 슬롯 + Item state 3**
`Trigger`가 `Textarea`·`Input`과 같은 4상태를 그대로 갖는다(`border-input` `rounded-md` `px-3 py-2` `text-sm`, `data-[size=default]:h-9` / `data-[size=sm]:h-8`). `Content`는 `shadow-md` 슬롯, `Item`은 `DropdownMenuItem`과 같은 3상태.

**`Pagination` — Link state 2 + Prev/Next/Ellipsis**
`isActive`가 **실제 prop**이라 variant로 만든다(active는 `outline` 버튼 형태). `PaginationLink` `size-9`, `Previous`/`Next` `px-2.5`, 컨테이너 `gap-1`.

**`Progress` — 단일 + `doc/` 프레임**
트랙 `h-2` `w-full` `rounded-full` `bg-primary/20`, 인디케이터 `bg-primary`.

> **퍼센트는 데이터지 variant가 아니다.** 값이 연속이라 variant로 만들면 끝이 없다. 컴포넌트는 하나만 만들고, 인디케이터 레이어 폭을 손으로 조절하게 한다. 감을 위해 `doc/Progress-예시` 프레임에 0 / 33 / 66 / 100을 그린다.

**`ScrollArea` → `ScrollBar` 만 만든다**
`ScrollArea` 루트와 `Viewport`에는 **시각이 없다** — `relative`, `size-full rounded-[inherit]`이 전부다. 그릴 값이 있는 것은 스크롤바뿐이다.

`ScrollBar` **variant 2**: `vertical`(`w-2.5` `h-full`) / `horizontal`(`h-2.5`), 썸 `bg-border` `rounded-full`.

**`Toaster` → `Toast` 로 이름을 바꿔 만든다 — 15개 중 유일한 이름 불일치**

`sonner.tsx` 40줄은 전부 **설정**이다. 레이아웃이 없고 실제 토스트는 sonner 라이브러리가 그린다. 그래서 `Toaster`라는 이름의 Figma 컴포넌트는 만들 수 없다.

그런데 코드가 토스트의 **모양을 결정하고는 있다**:

```ts
'--normal-bg':     'var(--popover)',
'--normal-text':   'var(--popover-foreground)',
'--normal-border': 'var(--border)',
'--border-radius': 'var(--radius)',
icons: { success, info, warning, error, loading }   // 각 size-4
```

토스트는 화면 시안에서 자주 그려야 하는 요소다. 위 4개 토큰과 5개 아이콘을 그대로 써서 **`Toast`(variant 5: `success`/`info`/`warning`/`error`/`loading`)** 를 만든다.

> **description에 반드시 적는다:** *"코드에 `Toast` 컴포넌트는 없다. `sonner.tsx`의 CSS 변수 매핑을 재현한 것이며, 레이아웃(패딩·간격)은 sonner 라이브러리가 정한다 — 여기서 바꿔도 코드에 반영되지 않는다."*
>
> 코드가 원본이라는 원칙의 예외가 아니다. **색·radius·아이콘은 코드가 정한 값 그대로**이고, 코드에 대응물이 없는 것은 레이아웃뿐이다. 그 경계를 description이 긋는다.

### 4.5 토큰 바인딩 (필수)

모든 색·간격·radius를 라운드 1의 Variables에 바인딩한다. 하드코딩 hex 0건.

**투명도가 붙은 색**(`bg-primary/15`, `bg-primary/20`, `ring-destructive/20`)은 해당 Variable을 fill로 바인딩하고 **그 paint 의 `opacity`** 로 비율을 준다. 별도 Variable을 만들지 않는다 — 라운드 4에서 다크 값이 들어올 때 자동으로 따라오게 하려면 이 방법뿐이다.

> **레이어 불투명도(`node.opacity`)와 구별한다.** `bg-primary/15`는 **배경만** 15%이고 글자·아이콘은 불투명하다. 레이어 불투명도를 쓰면 자식까지 전부 흐려져 다른 화면이 된다.
>
> 반대로 `disabled:opacity-50`·`peer-disabled:opacity-50`은 **요소 전체**를 흐리므로 그때는 `node.opacity`가 맞다. 둘을 바꿔 쓰지 않는다.

### 4.6 description 은 `descriptionMarkdown` 에 쓴다 — 묶음 1이 남긴 손상 11건

**착수 전 확인 중에 발견했다.** Figma의 `node.description` setter 는 `<` `>` `&` `"` 를 HTML 이스케이프한다. 묶음 1이 여기에 직접 써서 **11개 노드의 description 이 손상돼 있다.**

왕복 테스트 결과:

| 쓰는 속성 | 쓴 값 | 되읽은 값 | 판정 |
|---|---|---|---|
| `description` | `A<B>C & D` | `A&lt;B&gt;C &amp; D` | ❌ 이스케이프됨 |
| `descriptionMarkdown` | `A<B>C & D` | `A<B>C & D` | ✅ 그대로 |
| 텍스트 레이어 `characters` | `A<B>C & D` | `A<B>C & D` | ✅ 그대로 |
| 노드 `name` | `A<B>C & D` | `A<B>C & D` | ✅ 그대로 |

`descriptionMarkdown` 에 쓰면 `description` 이 올바르게 파생된다. 반대로 `description` 에 쓰면 **`descriptionMarkdown` 은 빈 채로 남는다** — 실제로 11개 전부 비어 있다.

`Card` 는 읽고-고쳐-쓰기를 반복해 3중 이스케이프(`&amp;amp;lt;Card&amp;amp;gt;`)까지 갔다. **이스케이프된 값을 되읽어 다시 쓰면 매번 한 겹씩 쌓인다.**

**규칙:** 앞으로 모든 description 은 `descriptionMarkdown` 에 쓴다. 묶음 2에서 기존 11건을 언이스케이프해 옮긴다(`&amp;` 를 마지막에 풀고 안정될 때까지 반복). 텍스트 레이어와 노드 이름은 영향이 없으므로 그대로 둔다.

### 4.7 이름 규칙

- 문서용 프레임: `doc/<이름>` (상태표·예시)
- 메모: `note/<이름>` (만들지 않은 것·후보)

묶음 1에서 정한 규칙 그대로다.

---

## 5. 만들지 않는 것

| 대상 | 왜 |
|---|---|
| `ScrollArea` 루트 · `Viewport` | 시각 없음 (`relative`, `size-full`) |
| `DropdownMenu`의 `Portal`·`Group`·`RadioGroup`·`Sub`·`SubTrigger`·`SubContent`·`Trigger` | 구조·동작 전용 |
| `Select`의 `Group`·`ScrollUpButton`·`ScrollDownButton`·`Value` | 위와 같음 |
| `ReadCountBadge`의 "숨김" 상태 | `null` 반환 — Figma에 만들 수 없다. `note/`로 기록 |
| `Progress`의 퍼센트별 variant | 값이 연속 |
| 미사용 4개 컴포넌트 | 묶음 1에서 제외 합의됨 |

---

## 6. 검증

### 6.1 코드 정리 — grep은 주석 줄을 제외해야 한다

**`button.tsx:16`의 주석이 `shadow-xs`라는 문자열을 품고 있다**(묶음 1이 그 클래스를 뺀 이유를 적은 주석). 순진한 `grep -c "shadow-xs"`는 **영원히 0이 되지 않는다.**

검증에 쓸 형태 — 실제로 돌려 확인했다:

```bash
cd apps/page0127/src/shared/ui
grep -rn "shadow-xs" . | grep -vE ":[[:space:]]*//" | wc -l
grep -rn "dark:"     . | grep -vE ":[[:space:]]*//" | wc -l
grep -rn "bg-black"  . | grep -vE ":[[:space:]]*//" | wc -l
```

기대값 (**줄 수**, `wc -l` 기준):

| 시점 | `shadow-xs` | `dark:` | `bg-black` |
|---|---:|---:|---:|
| 착수 전 (실측) | 3 | 7 | 1 |
| 묶음 2 후 | 2 | 6 | **0** |
| 묶음 3 후 | 1 | 1 | 0 |
| 묶음 4 후 | **0** | **0** | **0** |

> **새로 다는 주석에는 클래스 문자열을 넣지 않는다.** 이유만 적는다 (예: *"07 §2.3 — 표면에 붙어 있어 그림자를 뺐다"*). 같은 자기모순을 두 번 냈던 교훈이다.

### 6.2 타이포

```bash
cd apps/page0127
grep -rn "font-semibold" --include="*.tsx" src app | grep -vE ":[[:space:]]*//" | wc -l
grep -rn "sm:text-3xl"   --include="*.tsx" src app | wc -l
```

| | 착수 전 (실측) | 묶음 2 후 |
|---|---:|---:|
| `font-semibold` | 0 | 0 (유지) |
| `sm:text-3xl` | 1 (`ReadingProgressOverview:86` 단독) | **0** |

`text-4xl`·`text-6xl` 4곳은 **`stat` 역할이라 남는다**(§1.3). grep 기대값을 0으로 두지 않는다.

### 6.3 시각 실측 (Playwright)

클래스만 빼는 변경이라 로직 위험은 없으나 눈으로 확인한다. 묶음 1과 같은 방식으로 `getComputedStyle`을 읽는다.

- `textarea`의 `boxShadow`가 `none`, `border`는 유지
- `dialog` 오버레이의 `backgroundColor`가 `rgba(0, 0, 0, 0.5)` — `bg-overlay` 치환 전후가 **같아야 한다**
- `ReadingProgressOverview` h2의 `fontSize`가 데스크톱 **28px**, `lineHeight` **40px**, `fontWeight` **700**
- `switch`·`select`의 focus ring이 그대로 (`focus-visible` 규칙은 건드리지 않는다)

### 6.4 Figma ↔ 코드 대조

각 묶음 종료 시 스크립트로 확인한다.

- 만든 컴포넌트에 **하드코딩 hex 0건** (모든 fill이 Variable 바인딩 또는 바인딩+불투명도)
- 컴포넌트·variant 이름이 코드의 export·prop 값과 일치 — **예외는 `Toast` 하나**(§4.4)
- 모든 컴포넌트에 description이 있고 코드 경로를 포함
- **`descriptionMarkdown` 이 비어 있지 않고, 이스케이프 흔적(`&lt;` `&gt;` `&amp;`)이 없다**(§4.6)

### 6.5 회귀

기존 테스트 4종이 전부 통과해야 한다.

> **예상되는 변화:** `dark:bg-input/30` 등을 지우면 `--input`·`--destructive` 토큰의 사용처가 준다. `token-usage.test.ts`는 *"쓰는데 정의가 없는 것"* 을 잡지 그 반대는 아니므로 통과한다. 토큰이 덜 쓰이게 되는 것은 정리의 결과이지 회귀가 아니다.

---

### 6.6 묶음 2 완료 기록 (2026-07-28)

**만든 것** — `Components` 페이지에 5개. 전부 `descriptionMarkdown` 에 코드 경로 포함.

| 컴포넌트 | 형태 | 노드 |
|---|---|---|
| `Textarea` | COMPONENT_SET, state 4 | `65:14` |
| `Label` | COMPONENT_SET, state 2 | `65:19` |
| `Avatar` | COMPONENT_SET, type 2 | `65:24` |
| `Dialog` | COMPONENT, 슬롯 8층 | `70:2` |
| `ReadCountBadge` | COMPONENT_SET, size 3 | `74:11` |

**코드 정리** (커밋 `f4a88a1`) — `textarea` 그림자·다크 3개, `dialog` 오버레이 토큰화, `ReadingProgressOverview` 유틸 복귀.

**검증 결과** (전부 실측)

| 항목 | 기대 | 실측 |
|---|---|---|
| `shadow-xs` (주석 제외) | 3 → 2 | **2** ✅ |
| `dark:` | 7 → 6 | **6** ✅ |
| `bg-black` | 1 → 0 | **0** ✅ |
| `sm:text-3xl` | 1 → 0 | **0** ✅ |
| `font-semibold` | 0 유지 | **0** ✅ |
| vitest | 통과 | **28파일 181개 통과** ✅ |
| `tsc --noEmit` | 0 | **0** ✅ |
| 컴포넌트 fill·stroke 바인딩 누락 | 0 | **0** ✅ |
| description 이스케이프 잔재 | 0 | **0** (11건 복구) ✅ |

Playwright 실측 (1280px):

| 대상 | 기대 | 실측 |
|---|---|---|
| `.heading-1` | 28 / 40 / 700 | **28px / 40px / 700** ✅ |
| `bg-overlay` | `rgba(0,0,0,0.5)` | **`rgba(0, 0, 0, 0.5)`** ✅ |
| `textarea` 그림자 | `none` | **`none`** ✅ |
| `textarea` 테두리 | `--line` | **`rgb(223, 227, 232)`** ✅ |

700px(640~767 구간)에서 `.heading-1` 은 **24px / 34px / 700** — §2에 적은 의도된 변화 그대로다.

**계획과 달라진 것 넷**

**① `node.description` 이 아니라 `descriptionMarkdown` 이어야 했다.** 계획 착수 전 왕복 테스트에서 발견해 §4.6으로 스펙에 반영했고, Task 2로 11건을 복구했다.

**② paint 의 `opacity` 는 객체 복사로 안 들어간다.** `Object.assign({}, paint, { opacity: 0.15 })` 로 만든 fill 이 `opacity: 1` 로 저장돼 `ReadCountBadge` 가 통짜 파란 알약이 됐다(파란 배경 위 파란 글자). Figma 권장 방식인 **복제 → 수정 → 재대입**(`JSON.parse(JSON.stringify(node.fills))`)으로 고쳤다. 바인딩은 유지된다. **스크린샷을 보지 않았으면 못 잡았다** — 스크립트 반환값은 성공처럼 보였다.

**③ `figma.createComponent()` 는 `currentPage` 에 붙는다.** 작업 대상 페이지 변수를 들고 있어도 소용없다 — `page.appendChild()` 를 명시하지 않은 `Dialog` 가 `Foundations` 페이지에 생성됐다. 옮겨서 해결했다. `Textarea`·`Label`·`Avatar` 는 `appendChild` 를 넣어둬서 무사했다.

**④ `combineAsVariants()` 는 컨테이너를 늘리지 않는다.** 묶음 1의 메모는 *"자식이 겹친다"* 였는데, 실제로는 **자식 좌표는 들어가지만 세트 프레임이 그대로**여서 첫 variant 만 보인다. 자식 배치 전에 `resizeWithoutConstraints()` 로 세트를 먼저 키워야 한다.

**남은 것 (묶음 2 범위 밖으로 기록)**

- `doc/Button 상태` 프레임의 fill 4건이 Variable 에 바인딩돼 있지 않다. **컴포넌트가 아니라 문서 프레임**이라 완료 기준에는 안 걸리지만, 묶음 3에서 정리할 후보다.
- 캔버스 겹침 2건(`doc/Button 상태` ↔ `doc/Skeleton 사용 예시`·`AlertDialog`)을 발견해 오른쪽 열을 `x=700` 으로, `note/` 를 `x=1400` 으로 옮겼다. 현재 최상위 노드 겹침 **0건**.

---

### 6.7 묶음 3 완료 기록 (2026-07-28)

**만든 것** — 6개. 전부 `descriptionMarkdown` 에 코드 경로 포함.

| 컴포넌트 | 형태 | 노드 |
|---|---|---|
| `Popover` | COMPONENT, 슬롯형 | `86:2` |
| `Badge` | COMPONENT_SET, variant 4 | `86:12` |
| `Switch` | COMPONENT_SET, state 2 | `86:17` |
| `DropdownMenu` | COMPONENT, 슬롯 5층 | `88:2` |
| `DropdownMenuItem` | COMPONENT_SET, state 3 | `88:19` |
| `ErrorFallback` | COMPONENT, 완성형 | `89:2` |

**코드 정리** — `switch` 그림자 1 + 다크 3, `badge` 다크 3, `dropdown-menu` 다크 1, 그리고 `badge`·`button` 의 `text-white` → `text-primary-foreground`.

**검증 결과** (전부 실측)

| 항목 | 기대 | 실측 |
|---|---|---|
| `shadow-xs` (주석 제외) | 2 → 1 | **1** ✅ |
| `dark:` | 6 → 1 | **1** ✅ |
| `text-white` | 3 → 1 | **1** ✅ |
| `bg-black` | 0 유지 | **0** ✅ |
| vitest | 통과 | **28파일 181개** ✅ |
| `tsc --noEmit` | 0 | **0** ✅ |
| **페이지 전체** 바인딩 누락 | 0 | **0** ✅ |
| description 없는 컴포넌트 | 0 | **0** (16/16) ✅ |
| 최상위 노드 겹침 | 0 | **0** ✅ |

남은 `shadow-xs`·`dark:` 는 `select.tsx:38` 하나(묶음 4 몫), `text-white` 는 `user-avatar.tsx:98`(의도적 제외 — 닉네임별 생성 색 위의 모노그램이라 대응 토큰이 없다).

**치환이 무해한지는 산출물에서 확인했다.** 개발 서버가 실제로 서빙하는 CSS 를 받아 두 규칙을 대조했다:

```css
.text-primary-foreground { color: var(--primary-foreground) }   /* → var(--gray-0) → #fff */
.text-white              { color: var(--color-white)        }   /* → #fff */
```

둘 다 `#fff` 로 귀결된다. 소스의 토큰 체인을 눈으로 따라가는 대신 **빌드 결과를 대조**한 이유는, `@theme inline` 이 빌드 시점에 참조를 치환하기 때문이다 — 소스만 봐서는 최종 값이 확정되지 않는다.

> Playwright 계측은 이번에 못 했다. 다른 세션이 브라우저를 점유해(`Browser is already in use`) 접근할 수 없었다. CSS 대조가 같은 질문(두 클래스가 같은 색인가)에 더 직접적으로 답하므로 대체했다.

**`text-white` 를 바꾼 이유.** `badge` 의 destructive 가 `text-white` 인데 묶음 1 이 만든 Figma Button destructive 는 이미 `primary-foreground` Variable 에 묶여 있었다. 값은 둘 다 흰색이라 지금은 같아 보이지만 **한쪽만 바뀌면 조용히 갈라진다.** 사용자가 "코드를 Figma 에 맞춘다"로 결정해 `button` 까지 함께 고쳤다(같은 이탈을 둘로 남기면 다음 사람이 어느 쪽이 맞는지 알 수 없다).

**계획과 달라진 것 셋**

**① `Card` 의 가로 여백은 컨테이너가 아니라 슬롯에 있었다.** `ErrorFallback` 을 만들며 기존 `Card`(`36:10`)의 값을 읽어 쓰려 했는데, 컨테이너 `paddingLeft` 가 **0** 이라 내 `|| 24` 폴백이 그걸 덮었다. 실제 `Card` 는 컨테이너가 세로 20 / 가로 0 이고 `CardHeader`·`CardContent`·`CardFooter` 가 각각 가로 24 를 갖는다. 보이는 결과는 같지만 **레이어 구조가 달라져** 교정했다. `0 || 기본값` 은 0 을 삼킨다.

**② `note/` 프레임이 커지며 또 겹쳤다.** 묶음 2 에서 `Skeleton` 을 덮었던 것과 같은 일이 이번엔 `AlertDialog` 에서 났다(406 → 723px). 프레임을 `x=1900` 으로 옮겨 해결. **`note/` 에 내용을 추가하면 반드시 겹침 검사를 다시 돌린다.**

**③ 내가 묶음 2 에 추가한 `note/` 텍스트가 바인딩돼 있지 않았다.** 묶음 1 의 note 텍스트는 `text/strong`·`text/body` 에 묶여 있는데 내 추가분만 하드코딩이었다. 묶음 2 검증이 *컴포넌트만* 훑어서 놓쳤다. 이번에 **페이지 전체**로 범위를 넓혀 잡았고, 겸해 묶음 2 가 남겨둔 `doc/Button 상태` 배경 4건(§6.6 의 "남은 것")도 `background` 에 묶었다. **페이지 전체 바인딩 누락이 처음으로 0 이 됐다.**

---

### 6.8 묶음 4 완료 기록 (2026-07-28) — 라운드 2 종료

**만든 것** — 6개.

| 컴포넌트 | 형태 | 노드 |
|---|---|---|
| `Select` | COMPONENT_SET, state 4 (Trigger) | `99:18` |
| `SelectMenu` | COMPONENT, 슬롯형 (Content+Item) | `100:2` |
| `Pagination` | COMPONENT, 슬롯형 | `100:10` |
| `Progress` | COMPONENT + `doc/Progress 예시` | `101:2` / `101:4` |
| `ScrollBar` | COMPONENT_SET, orientation 2 | `101:26` |
| `Toast` | COMPONENT_SET, type 5 | `101:42` |

**Button 세트 보강** — 6조합 추가로 **12조합**이 됐다(§아래).

**코드 정리** — `select.tsx:38` 의 `shadow-xs` 1 + `dark:` 3.

### 라운드 2 종료 — `shared/ui` 의 07 위반이 0이다

| 항목 | 라운드 2 시작 | 지금 |
|---|---:|---:|
| `shadow-xs` | 4 | **0** ✅ |
| `dark:` | 15 | **0** ✅ |
| `bg-black` | 2 | **0** ✅ |
| `font-semibold` | 78(앱 전체) | **0** ✅ |

`text-white` 만 **1** 이 남는다 — `user-avatar.tsx:98` 의 모노그램. 배경이 `getMonogramColor(nickname)` 이 만드는 닉네임별 생성 색이라 대응 semantic 토큰이 없다. **의도적으로 남긴 것이지 미완이 아니다.**

**Figma 최종 상태**

| 항목 | 값 |
|---|---|
| 컴포넌트 | **22개** (Button 세트의 12조합은 1개로 셈) |
| description 누락 | **0** |
| 페이지 전체 바인딩 누락 | **0** |
| 최상위 노드 겹침 | **0** |
| vitest | **30파일 195개 통과** |

### 묶음 1 Button 인구조사 오류 정정

`pagination.tsx` 가 `buttonVariants({ variant: isActive ? 'outline' : 'ghost' })` 를 쓰는 걸 보고 확인한 결과, **묶음 1의 `note/` 가 틀렸다.**

`<Button …>` **87건**을 여는 태그 파싱으로 전수 집계한 실제 조합:

| 조합 | 건수 | 묶음 1 Figma |
|---|---:|---|
| `outline / default` | 20 | ✅ |
| `default / default` | 18 | ✅ |
| **`ghost / sm`** | **15** | ❌ |
| `outline / sm` | 13 | ✅ |
| `default / sm` | 12 | ✅ |
| `default / lg` | 2 | ❌ |
| `ghost / icon` | 2 | ❌ |
| `outline / icon-sm` | 2 | ❌ |
| `destructive / default` | 1 | ✅ |
| `secondary / default` | 1 | ❌ |
| `ghost / default` | 1 | ❌ |

묶음 1은 `ghost`·`secondary`·`icon`·`icon-sm` 을 *"쓰인 적이 없다"* 고 적었으나 **`ghost` 는 18건(13개 파일)으로 `outline` 다음으로 많다.** 반대로 묶음 1이 만든 `destructive / sm` 은 실사용 0건이다.

사용자 결정으로 **빠진 6조합을 전부 채웠다.** `destructive / sm` 은 지우지 않았다 — 세트에서 variant 를 빼면 참조 인스턴스가 깨지고, 남기는 비용이 없다. `link`(0건)·`icon-lg`(0건)는 묶음 1 기록 중 유일하게 맞은 항목이라 그대로 뒀다.

`note/` 의 틀린 문장은 **추가가 아니라 교체**했다. 틀린 채로 남기면 다음 사람이 그걸 근거로 판단한다.

> **왜 틀렸나.** 묶음 1이 어떻게 셌는지는 남아 있지 않지만, `badge`·`sonner` 를 파일명으로 세서 0으로 잘못 잡았던 것과 같은 계열로 보인다. **재발 방지: variant 사용량은 여는 태그를 파싱해 `variant × size` 조합으로 전수 집계한다**(명시하지 않은 prop 은 CVA 기본값으로 계산). 스크립트는 일회용이라 남기지 않았지만 방법은 이 문단이 기록이다.

**계획과 달라진 것 둘**

**① 중복 가드가 자기 글에 걸렸다.** `note/` 에 묶음 4 항목을 추가하기 전 `characters.includes('묶음 4')` 로 중복을 검사했는데, **같은 프레임의 Button 정정문에 "정정 (2026-07-28, 묶음 4)" 라는 문구가 있어** 항상 "이미 있음"으로 판정됐다. 가드를 **레이어 이름 기준**(`c.name === 'note/묶음 4 본문'`)으로 바꿔 해결. 계획서의 grep 자기모순과 정확히 같은 구조다 — **존재 검사는 내용이 아니라 식별자로 한다.**

**② `Pagination` 은 Button 인스턴스를 품지 않는다.** 코드에서는 `buttonVariants` 를 호출해 Button 의 시각을 그대로 쓰지만, Figma 인스턴스에는 자식을 넣을 수 없어 같은 값을 직접 그렸다. **Button 을 고치면 Pagination 도 손으로 맞춰야 한다** — description 에 굵게 적었다.

**남은 것 (라운드 2 밖)**

- `Toast` 의 success/warning 색이 primitive(`teal/500`·`amber/500`)에 직접 묶여 있다. sonner 가 그리는 색이라 앱 코드에 대응 semantic 이 없다 — 라운드 4에서 다크 값과 함께 설계한다.
- `switch` 의 `h-[1.15rem]`(18.4px) 토큰화 (묶음 3에서 기록)
- `user-avatar` 연결 확인 (묶음 1 §2.1)
- 미사용 4개 컴포넌트의 처리
- Code Connect (플랜이 올라가면)

---

## 7. 완료 기준 — 전부 충족 (2026-07-28)

| | 기준 | 실측 | 판정 |
|---|---|---|---|
| 1 | 15개가 `Components` 페이지에 있고 각각 `descriptionMarkdown` 에 코드 경로가 있다 | 묶음 2~4 로 **17개** 추가(계획 15 + `SelectMenu`·`DropdownMenuItem`), description 누락 **0** | ✅ |
| 2 | 하드코딩 색 0건 | 페이지 **전체** 바인딩 누락 **0** (컴포넌트뿐 아니라 `doc/`·`note/` 포함) | ✅ |
| 3 | `shared/ui` 에서 `shadow-xs`·`dark:`·`bg-black` 모두 0 (주석 줄 제외) | **0 / 0 / 0** | ✅ |
| 4 | `ReadingProgressOverview` 가 `.heading-1` 을 쓴다 | 적용됨. 실측 28px/40px/700(≥768px), 24px/34px/700(<768px) | ✅ |
| 5 | 기존 테스트 통과 | **30파일 195개 통과**, `tsc` 오류 0 | ✅ |
| 6 | 만들지 않은 것이 `note/` 또는 이 문서에 기록돼 있다 | `note/만들지 않은 것` 에 묶음 2·3·4 절 + Button 정정 | ✅ |
| 7 | 묶음 1이 남긴 description 손상 11건이 복구돼 있다 (§4.6) | 묶음 2에서 11/11 복구, 이스케이프 잔재 **0** | ✅ |

> **1번 기준을 초과 달성한 이유:** 계획은 15개였으나 `Select` 를 Trigger(상태 4종)와 Content(슬롯)로 나눠야 했고(`SelectMenu`), `DropdownMenuItem` 도 hover 배치 수요 때문에 별도 컴포넌트로 뺐다. 둘 다 코드 export 와 1:1 이 아니어서 description 에 그 사실을 적었다.

**라운드 2 전체 요약**

| 묶음 | 컴포넌트 | PR |
|---|---|---|
| 1 | `Button`(6조합) `Card` `Skeleton` `Input` `AlertDialog` | (직접 커밋) |
| 2 | `Textarea` `Label` `Avatar` `Dialog` `ReadCountBadge` | #19 |
| 3 | `Popover` `Badge` `Switch` `DropdownMenu` `DropdownMenuItem` `ErrorFallback` | #22 |
| 4 | `Select` `SelectMenu` `Pagination` `Progress` `ScrollBar` `Toast` + Button 6조합 보강 | (이번) |

**컴포넌트 22개 · Button 12조합 · 하드코딩 색 0 · 07 위반 0.**

---

## 8. 라운드 3 이후로 넘기는 것

- **라운드 3** — 도메인 컴포넌트 (`BookCover`의 비대칭 radius `2px 6px 6px 2px`, `BookCard`)
- **라운드 4** — 다크모드 (Semantic 컬렉션에 Dark 모드 값 추가)
- `switch`의 `h-[1.15rem]` 토큰화
- `UserAvatar` 연결 확인 (묶음 1 §2.1 — 기능이 화면에 연결되지 않았을 가능성)
- 미사용 4개의 처리
- Code Connect (플랜이 올라가면)

---

## 9. 참고

- `2026-07-27-design-system-round2-components-design.md` — 묶음 1. §6.3(상태 배치 기준) · §7(description 방식) · §8.5(구현 중 달라진 것) · §8.6(`combineAsVariants` 겹침)
- `2026-07-28-typography-scale-revision-design.md` — 07 §2.2 스케일 7단 + `stat`
- `00_docs/07_리디자인_진단_및_실행안.md` — §2.2 타이포, §2.3 그림자
