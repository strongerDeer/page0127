# 디자인 시스템 라운드 2 — 컴포넌트 묶음 1 설계

- 작성일: 2026-07-27
- 범위: `shared/ui` 컴포넌트를 Figma 컴포넌트로 옮긴다. **이번 스펙은 묶음 1(5개)까지.**
- 선행: [라운드 1 Foundations](2026-07-26-design-system-foundations-design.md) — 토큰 78개·Text Style 7개 완료
- Figma 파일: `page0127` (`5ErSDsG1MNfvexSDZ2PfLS`)

---

## 0. 한 줄 요약

사용량 상위 5개(`button` `card` `skeleton` `input` `alert-dialog`)를 **07 원칙에 맞게 코드를 정리한 뒤** Figma 컴포넌트로 만들고, 모든 색·간격을 라운드 1의 Variables에 바인딩한다. 여기서 정해질 패턴이 나머지 15개의 틀이 된다.

---

## 1. 조사 결과 — 계획서의 전제 세 가지가 틀렸다

라운드 1 계획서는 라운드 2를 *"shadcn 계열 **27개** 컴포넌트 + variants + **Code Connect**"* 로 적어뒀다. 착수 전 실측한 결과 셋 다 정정이 필요하다.

### 1.1 개수는 27이 아니라 28

`shared/ui`의 `.tsx`는 **28개**다. 계획서의 27은 세면서 틀린 숫자다.

### 1.2 의존 관계로 순서를 정할 수 없다

브레인스토밍 초입에 "Dialog가 Button을 품으니 순서가 중요하다"고 했으나 **틀렸다.** `shared/ui` 내부 의존은 둘뿐이다.

```
DeleteConfirmDialog → alert-dialog
SubmitButton        → button
```

shadcn의 `dialog`·`alert-dialog`는 `Button`을 import하지 않는다. 묶는 순서는 의존이 아니라 **사용량**으로 정한다.

### 1.3 Code Connect는 플랜이 막는다

MCP로 실제 호출해 확인했다:

> `You need a Dev or Full seat on an Organization or Enterprise plan to use Code Connect.`

Pro 플랜에서는 불가능하다. 계획서에 넣기 전 확인했어야 했다. 대안은 §5.

---

## 2. 사용량 실측

`import` 문 기준(export 이름으로 재확인). 이 숫자가 묶음 순서의 근거다.

| 사용처 수 | 컴포넌트 |
|---:|---|
| **41** | `button` |
| 17 | `card` |
| 9 | `skeleton` |
| 8 | `PageContainer` |
| 7 | `input` |
| 6 | `alert-dialog` |
| 4 | `textarea` · `dialog` · `avatar` |
| 3 | `label` · `RelativeTime` · `ReadCountBadge` |
| 2 | `popover` · `dropdown-menu` · `SubmitButton` · `badge` · `ErrorFallback` |
| 1 | `switch` · `select` · `scroll-area` · `progress` · `pagination` · `ErrorBoundary` · `Toaster` |
| **0** | `UserAvatar` · `UserLink` · `StatusTabFilter` · `DeleteConfirmDialog` |

> **조사 중 정정 하나:** 처음에 파일명으로 검색해 `badge`·`sonner`도 0으로 봤으나, export 이름(`Badge`·`Toaster`)으로 다시 세니 각각 2곳·1곳에서 쓰이고 있었다. 사용량 0은 **4개**다.

### 2.1 `UserAvatar` — 연결이 빠진 것으로 보인다

미사용 4개 중 하나는 별도로 기록해 둔다. `user-avatar.tsx`(143줄)는 **2026-07-23 커밋 "feat: 프로필 이미지 없는 유저에게 모노그램 아바타 표시"** 로 개선됐는데, 그 커밋은 **`user-avatar.tsx` 한 파일만 바꿨다.** 다른 worktree에도 사용처가 없다.

기능으로 만든 것이 화면에 연결되지 않은 상태일 수 있다. **이 스펙의 범위는 아니지만 확인이 필요한 사항으로 남긴다.**

---

## 3. 확정된 결정

| # | 결정 | 근거 |
|---|---|---|
| 1 | **코드를 07 원칙에 맞게 정리한 뒤 Figma로 옮긴다** | 있는 그대로 옮기면 원칙 위반이 Figma에 박제되고, 나중에 양쪽을 다 고쳐야 한다 |
| 2 | **미사용 4개는 범위에서 제외** | 쓰이지 않는 것을 Figma에 만들면 유령이 늘고, 실제로 쓸 때는 요구가 달라져 어차피 다시 만든다 |
| 3 | **묶음은 사용량 순 5개씩** | 가치 순서가 데이터로 정해진다. `button` 하나가 41곳이라 첫 묶음의 효과가 가장 크다 |
| 4 | **라운드 2 스펙은 묶음 1까지만** | 묶음 1에서 정해질 패턴이 나머지의 틀이다. 패턴 전에 20개를 계획하면 헛수고다 |
| 5 | **Code Connect 제외, description으로 대체** | Pro 플랜 제약 (§1.3) |

---

## 4. 범위

### 4.1 대상 20개

28개에서 8개를 뺀다.

| 제외 | 이유 |
|---|---|
| `UserAvatar` · `UserLink` · `StatusTabFilter` · `DeleteConfirmDialog` | 사용량 0 (결정 2) |
| `ErrorBoundary` | React 에러 경계 — 시각 요소가 없다 |
| `RelativeTime` | "3일 전" 텍스트 계산 로직 |
| `PageContainer` | 레이아웃 래퍼 — 컴포넌트가 아니라 여백 규칙에 가깝다 |
| `SubmitButton` | `button` + 로딩 상태. **Figma에서는 `button`의 상태로 표현**하고 별도 컴포넌트로 만들지 않는다 (이중 관리 방지) |

### 4.2 묶음

```
묶음 1 ✅ 완료   button(41) · card(17) · skeleton(9) · input(7) · alert-dialog(6)
묶음 2               textarea(4) · dialog(4) · avatar(4) · label(3) · ReadCountBadge(3)
묶음 3               popover(2) · dropdown-menu(2) · badge(2) · ErrorFallback(2) · switch(1)
묶음 4               select(1) · scroll-area(1) · progress(1) · pagination(1) · Toaster(1, sonner.tsx)
```

**묶음 1의 다섯이 패턴 다섯 종류를 덮는다:**

| 컴포넌트 | 이 묶음에서 정해지는 패턴 |
|---|---|
| `button` | variants를 Figma에서 어떻게 줄이고 표현할지 |
| `card` | 07 "그림자 대신 선"의 기준형 |
| `input` | 폼 상태(focus/error/disabled) 표현 |
| `alert-dialog` | 그림자가 **허용되는** 경우(떠 있는 것) |
| `skeleton` | 가장 단순한 형태 — 하한선 |

### 4.3 이번 스펙에 하지 않는 것

- 묶음 2~4 (별도 스펙)
- Code Connect (플랜 제약)
- 도메인 컴포넌트(BookCover 등) — 라운드 3
- 다크모드 — 라운드 4
- 미사용 4개의 삭제 여부 판단

---

## 5. 코드 정리 기준

실측 결과 **정리 대상은 두 파일뿐**이다.

| 컴포넌트 | 현재 | 조치 |
|---|---|---|
| `button` | outline에 `shadow-xs`, `dark:` 4개 | **제거** |
| `input` | `shadow-xs`, `dark:` 2개 | **제거** |
| `alert-dialog` | `shadow-lg` | **유지** |
| `card` · `skeleton` | 해당 없음 | 불필요 |

### 5.1 `shadow` — 판정 기준은 "떠 있는가"

07 §2.3: *"그림자는 실제로 떠 있어야 하는 것에만 — 드롭다운, 모달, 토스트, sticky 헤더."*

입력 필드와 버튼은 페이지 표면에 붙어 있다. `shadow-xs`는 shadcn 기본값이지 우리 판단이 아니다. `input`은 이미 `border-input`을 갖고 있어 **그림자를 빼도 경계가 사라지지 않는다.**

`alert-dialog`의 `shadow-lg`는 모달이므로 유지한다. 묶음 1에서 그림자가 살아남는 유일한 자리이며, **"왜 여기만 허용되는가"를 Figma 문서에 남긴다.**

### 5.2 `dark:` — 지우는 것이 라운드 4를 돕는다

직관에 반할 수 있어 근거를 남긴다. 우리 다크모드는 shadcn 방식이 아니다.

```
shadcn 방식    className="bg-white dark:bg-input/30"   ← 컴포넌트마다 두 벌
우리 방식      --card 가 Light/Dark 에서 다른 값        ← 컴포넌트는 그대로
```

라운드 4는 **Semantic 컬렉션에 Dark 모드 값을 추가**하는 방식이다(라운드 1 설계 §3.3). `--card`가 모드에 따라 바뀌면 `bg-card`를 쓰는 컴포넌트는 한 줄도 안 바뀐다 — 2층 구조를 만든 이유가 이것이다.

남아 있는 `dark:` 유틸리티는 그때 **우리 토큰과 충돌한다.** 토큰이 이미 어두운 값을 주는데 유틸리티가 또 덮어쓴다. 지금 지우는 것이 라운드 4의 부채를 미리 없애는 일이다.

### 5.3 건드리지 않는 것

`input`의 `text-base md:text-sm`(모바일 16px / 데스크톱 14px)은 **iOS가 16px 미만 입력에 자동 확대하는 것을 막는 관례**다. 07 타이포 스케일과 무관하며, 스케일에 맞춘다고 건드리면 모바일에서 화면이 확대된다.

---

## 6. Figma 컴포넌트 구조

### 6.1 원칙 — 코드에 있고 실제로 쓰이는 것만

방향은 "코드 → Figma 미러"다. 코드에 없는 조합을 Figma에 만들면 **디자이너와 개발자가 서로 다른 것을 보게 되는 시작점**이 된다.

### 6.2 `Button` — 36조합을 6개로

```
CVA 정의     variant 6 × size 6 = 36
실사용       variant 3 — default(암묵 39곳) · outline(1) · destructive(1)
             size 2 — default · sm(2)
아이콘 버튼   0곳 — icon · icon-sm · icon-lg 전부 미사용
```

**Figma에는 `variant 3 × size 2 = 6개`만 만든다.**

`ghost`·`link`·`secondary`는 코드에 정의만 있고 쓰인 적이 없다. `icon` 계열은 아이콘 전용 버튼이 앱에 하나도 없다. 필요해지면 그때 코드와 Figma에 함께 추가하는 편이, 지금 유령 6개를 만드는 것보다 낫다.

남기는 `default`·`outline` 쌍은 07 §2.1이 명시적으로 요구하는 것이기도 하다 — *"채워진 버튼은 화면당 최대 1개, 나머지는 흰 배경 + 1px 보더."*

### 6.3 상태를 어디에 담는가 — Button과 Input이 갈린다

| | variant property로 | 문서 프레임에 상태표로 |
|---|---|---|
| `Button` | ❌ | ✅ hover·focus·disabled |
| `Input` | ✅ default/focus/error/disabled | ❌ |

**기준은 "그 상태를 화면에 배치할 일이 있는가"다.**

화면을 그릴 때 hover 상태의 버튼을 놓는 일은 거의 없다 — 그래서 Button의 상태를 variant로 만들면 `3 × 2 × 4 = 24`로 불어나기만 한다. 반면 폼 디자인에서는 **에러 상태를 실제로 배치한다.**

다만 "hover는 `primary/90`"이라는 정보는 어딘가 남아야 하므로, Button은 문서 프레임에 상태표를 그린다. **쓰이는 방식이 다르니 담는 그릇도 다르다.**

### 6.4 나머지 셋

- **`Card`** — variant가 없고 `CardHeader`·`CardTitle`·`CardFooter` 같은 슬롯 구조다. Figma에서도 **하위 컴포넌트로 나누고 조합**하게 만든다.
- **`Skeleton`** — variant도 상태도 없다. 컴포넌트 하나 + 크기 조절.
- **`AlertDialog`** — overlay + content + header + footer 구조. 07 그림자 예외의 사례이므로 그 근거를 description에 적는다.

### 6.5 토큰 바인딩 (필수)

모든 색·간격·radius를 **라운드 1의 Variables에 바인딩**한다. 하드코딩된 hex를 넣지 않는다.

라운드 4에서 다크모드 값을 넣을 때 **Figma 컴포넌트가 자동으로 따라오게** 하려면 이것이 유일한 방법이다. 라운드 1의 스타일 가이드를 이미 이 방식으로 만들어뒀다(스와치는 fill, `space`는 `width`, `corner`는 radius에 바인딩).

---

## 7. Code Connect 대안 — description에 코드 정보를 심는다

라운드 1에서 Variables에 Code Syntax(`var(--primary)`)를 심은 것과 같은 발상이다.

```
Button/default·default 의 description:

  @/shared/ui/button — <Button>
  기본값이라 variant·size 를 명시하지 않는다 (41곳 중 39곳이 이 형태)
  hover: bg-primary/90
```

| | 정식 Code Connect | description 방식 |
|---|---|---|
| Dev Mode 코드 스니펫 자동 표시 | ✅ | ❌ |
| 코드 경로·사용법 확인 | ✅ | ✅ |
| props ↔ variant 자동 매핑 | ✅ | ❌ (글로 적음) |
| 필요 플랜 | Org/Enterprise | **Pro 가능** |

핵심 가치인 *"이 Figma 컴포넌트가 코드의 무엇인가"*는 전달된다. 나중에 플랜을 올리면 정식 Code Connect로 교체할 수 있고, description의 매핑 정보가 그대로 근거가 된다 — 버리는 작업이 아니다. MCP에 `add_code_connect_map`·`get_context_for_code_connect`가 이미 있어 플랜만 되면 스크립트로 붙일 수 있다.

---

## 8. 검증

### 8.1 코드 정리 검증 (Playwright 실측)

`button` 41곳, `input` 7곳에 걸린다. 클래스만 빼는 변경이라 로직 위험은 없으나 시각 확인이 필요하다. 라운드 1에서 줄간격을 실측한 것과 같은 방식으로:

- 버튼의 `box-shadow`가 `none`인가
- outline 버튼의 `border-color`가 `--line`(`#dfe3e8`)으로 살아 있는가
- `input`의 focus ring이 그대로인가 (`focus-visible` 규칙은 건드리지 않는다)

### 8.2 Figma ↔ 코드 대조

만든 컴포넌트의 색·간격·radius가 **Variables에 바인딩**돼 있는지(하드코딩 hex가 없는지) 스크립트로 확인한다. 라운드 1에서 Semantic 46개의 alias를 전수 검증한 것과 같은 방법이다.

### 8.3 회귀

기존 테스트 4종이 전부 통과해야 한다.

> **예상되는 변화 하나:** `button.tsx`에서 `dark:bg-input/30`을 지우면 `--input` 토큰의 사용처가 하나 줄어든다. `token-usage.test.ts`는 "쓰는데 정의가 없는 것"을 잡지 그 반대는 아니므로 통과한다. **토큰이 안 쓰이게 되는 것은 정리의 결과이지 회귀가 아니다.**

---

### 8.4 묶음 1 완료 기록 (2026-07-27)

**코드 정리** (커밋 `0b11084`)

`button.tsx` — `shadow-xs` 1개 + `dark:` **7개**(스펙에 4개로 적었던 것을 정정), `input.tsx` — `shadow-xs` 1개 + `dark:` 2개 제거. `focus-visible:` 3개와 `text-base md:text-sm` 은 보존.

브라우저 실측(Playwright, computed style):

| 확인 | 결과 |
|---|---|
| 버튼 8개 `box-shadow` | 전부 `none` |
| primary 버튼 배경 | `rgb(30, 105, 203)` = `#1e69cb` |
| `input` `box-shadow` / `border-color` | `none` / `rgb(223, 227, 232)` = `#dfe3e8` = `--line` |

그림자만 사라지고 경계는 살아 있음을 확인했다.

**Figma** — `Components` 페이지

| 컴포넌트 | 내용 |
|---|---|
| `Button` | variant set **6** (variant 3 × size 2) |
| `Input` | variant set **4** (state) |
| `Card` · `Skeleton` · `AlertDialog` | 단독 컴포넌트 3 |
| `doc/Button 상태` | hover·focus·disabled × 3 variant 표 |
| `note/만들지 않은 것` | ghost·link·secondary, icon 3종 제외 근거 |

전부 Variables 바인딩. **하드코딩된 색 0건** — 전수 검사 스크립트로 확인했다(`doc/`·`note/` 로 시작하는 문서용 노드는 검사 대상에서 제외한다).

### 8.5 구현 중 계획과 달라진 것 셋

**① Card 슬롯을 개별 컴포넌트로 만들지 않았다.**

계획은 "슬롯 7종을 개별 컴포넌트로"였으나 **Figma 제약과 충돌한다** — 인스턴스에는 자식을 추가할 수 없어, 슬롯이 각각 컴포넌트면 `Card` 인스턴스 안에서 조립이 오히려 불가능해진다. 슬롯을 `Card` 내부 레이어로 두되 **이름을 코드 슬롯명과 1:1로 맞췄다**(`CardHeader` > `CardTitle`·`CardDescription`·`CardAction`, `CardContent`, `CardFooter`). 레이어 트리가 곧 JSX 구조가 된다.

**② AlertDialog 오버레이 — 처음엔 예외로 뒀다가 뒤집었다.**

코드가 `bg-black/50`을 쓰는데 팔레트에 대응 토큰이 없어, "Figma에만 토큰을 만들면 미러 원칙이 깨진다"는 이유로 바인딩 없이 남겼다. **최종 리뷰가 이것이 완료 기준("하드코딩된 색 0건")과 모순임을 지적했고, 판단을 뒤집었다** — 아래 ④가 그 결과다.

뒤집은 이유는 근거가 틀렸기 때문이 아니라 **선택지를 좁게 봤기 때문**이다. "Figma에만 만든다 vs 안 만든다" 두 갈래로 봤는데, **양쪽에 만드는** 세 번째 길이 있었다.

**③ Title 계열 3개가 07 타이포 스케일을 벗어난다 — 코드를 고치지 않았다.**

`CardTitle` 하나만 발견해 기록했다가 최종 리뷰에서 같은 이탈이 셋임을 확인했다.

| 컴포넌트 | 클래스 | 이탈 |
|---|---|---|
| `CardTitle` | `leading-none font-semibold` | weight **600** |
| `AlertDialogTitle` | `text-lg font-semibold` | weight **600** + **18px** |
| `DialogTitle` (묶음 2) | `text-lg leading-none font-semibold` | weight **600** + **18px** |

07 §2.2 는 weight 를 400/500/700 3단계로, 크기를 28/20/16/14/12 5단으로 못박았다. `font-semibold`(600)와 `text-lg`(18px)는 둘 다 그 밖이다 — 18px 는 `heading-mobile` 로만 존재하는 모바일 전용 값이다.

**코드를 고치지 않았다.** 이번 라운드의 정리 범위는 `shadow`·`dark:`로 합의됐고, 무엇보다 **셋이 일관되게 같은 값을 쓴다는 사실 자체가 신호**다. shadcn 이 기본으로 주는 값이긴 하나, 제목에 600·18px 가 계속 필요하다면 07 의 3단계·5단 스케일이 현실과 안 맞는 것일 수 있다.

**→ 07 스케일 자체를 재검토하기로 했다** (스케일을 넓힐지, 코드를 좁힐지). 이 판단 전에는 어느 쪽으로도 손대지 않는다. 라운드 2 나머지 묶음에서 Title 계열을 만날 때마다 이 표에 추가한다.

> **감사 방식의 구멍도 함께 드러났다.** `shadow`·`dark:`는 grep 으로 잡았지만 weight·size 이탈은 사람이 눈으로 훑어 하나를 놓쳤다. 묶음 2~4 에서는 `font-semibold|font-bold|font-normal|text-lg|text-xl|text-2xl` 처럼 **07 스케일 밖 클래스를 grep 하는 절차**를 코드 정리 태스크에 넣는다.

> **닫힘 (2026-07-28):** 재검토 결과 **07 스케일 쪽이 현실과 맞지 않았다.** `font-semibold`(600) 78곳 중 73곳이 앱 코드가 직접 선택한 값이었고, 500 과 600 이 같은 크기에서 섞여 있었다. weight 를 500 으로 통일하고(코드 78곳) 18·24px 를 정식 단계로 승격했다(문서만). 자세한 내용은 `2026-07-28-typography-scale-revision-design.md`.

**④ `overlay` 토큰을 신설했다 (최종 리뷰 후 추가 결정).**

처음에는 AlertDialog 오버레이의 `bg-black/50`을 "대응 토큰이 없으니 예외"로 두었으나, 계획서 완료 기준("하드코딩된 색 0건")과 모순이고 `dialog`·`popover`·`dropdown-menu`가 같은 오버레이를 써서 예외가 3~4번 반복될 참이었다.

**코드와 Figma를 함께 바꿔** 미러 원칙을 지켰다 — `semantic.json`에 `overlay`(검정 50%)를 추가하고, `globals.css`에 `--color-overlay` 매핑을, `alert-dialog.tsx`에 `bg-overlay`를 넣었다.

이 토큰만 primitive 를 참조하지 않고 값을 직접 갖는다. 브랜드 팔레트의 색이 아니라 "화면을 가리는 검정"이라 `blue`·`navy`·`gray` 램프 어디에도 대응이 없기 때문이다.

### 8.6 다음 묶음을 위한 구현 메모

`combineAsVariants()` 직후 **자식들이 같은 위치에 겹친다.** Button set이 57×36으로 나와서 알았고, variant×size 격자로 `x`/`y`를 직접 배치해야 했다. 묶음 2~4에서 variant set을 만들 때마다 반복된다.

---

## 9. 라운드 2 이후로 넘기는 것

- **묶음 2~4** (15개) — 묶음 1에서 패턴이 정해진 뒤 한 스펙으로 묶어도 된다
- **`UserAvatar` 연결 확인** (§2.1) — 기능이 화면에 연결되지 않았을 가능성
- **미사용 4개의 처리** — 삭제할지 살릴지는 별도 판단
- **Code Connect** — 플랜이 올라가면

---

## 10. 참고

- `docs/superpowers/specs/2026-07-26-design-system-foundations-design.md` — 라운드 1 (토큰·Variables)
- `00_docs/07_리디자인_진단_및_실행안.md` §2.1 §2.3 — 그림자·버튼 원칙의 근거
- `apps/page0127/src/shared/ui/` — 대상 컴포넌트
