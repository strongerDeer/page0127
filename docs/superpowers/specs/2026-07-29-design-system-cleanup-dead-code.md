# 디자인 시스템 정리 — 죽은 컴포넌트 13개 삭제

- 작성일: 2026-07-29
- 범위: 라운드 1~4 완료 후 남은 잔여 정리
- 선행: [라운드 4 다크모드](2026-07-29-design-system-round4-dark-design.md) — PR #28 병합으로 라운드 1~4 종료

---

## 0. 한 줄 요약

`src` 안에서 **어디서도 import 되지 않는 컴포넌트 13개(875줄)** 를 지웠다. 그중 하나(`badge`)는 **묶음 3에서 내가 Figma 컴포넌트까지 만든 것**이었다 — 사용량을 이름으로 세다 로컬 정의를 진짜 사용처로 오인했다.

---

## 1. 왜 지금인가

라운드 1~4를 진행하는 내내 이 파일들이 **일괄 변경에 계속 딸려왔다.**

| 파일 | 마지막 커밋 |
|---|---|
| `BookCardInfo.tsx` | **2026-07-28** — 라운드 2의 타이포 일괄 치환 |
| `BookCardCover.tsx` | 2026-07-18 — 스카이블루 리디자인 |
| `badge.tsx` | 2026-07-28 — 라운드 3의 `dark:` 제거 |

**화면에 없는 코드를 계속 관리하고 있었다.** 라운드 3이 `BookCard` 4형제를 발견해 기록했고(§7 별건), 이번에 전수로 확장했다.

---

## 2. 사용량을 이름으로 세면 틀린다

### 2.1 `badge` — 죽었는데 Figma 컴포넌트를 만들었다

묶음 3 조사에서 `<Badge` 를 grep 해 **"1개 파일 사용"** 으로 셌다. 그 1곳은 이것이었다:

```tsx
// src/features/admin-quality/ui/SeoPanel.tsx:3
const Badge = ({ ok, label }: { ok: boolean; label: string }) => …
```

**같은 파일 안에서 따로 정의한 로컬 컴포넌트다.** `shared/ui/badge.tsx` 와는 아무 관계가 없다.

그 오판 위에서 묶음 3은 `Badge`(variant 4) Figma 컴포넌트를 만들고 description 까지 달았다. **죽은 코드의 설계도를 그린 셈이다.**

### 2.2 오판의 출처는 묶음 1의 "정정" 이었다

묶음 1 스펙 §2 에 이런 문장이 있다:

> **조사 중 정정 하나:** 처음에 파일명으로 검색해 `badge`·`sonner`도 0으로 봤으나, export 이름(`Badge`·`Toaster`)으로 다시 세니 각각 **2곳·1곳**에서 쓰이고 있었다. 사용량 0은 **4개**다.

**처음 판단이 맞았고 "정정" 이 틀렸다.** 파일명 검색이 `badge` 를 0으로 본 것은 정확했는데, export 이름으로 다시 세면서 `SeoPanel` 의 로컬 `Badge` 를 사용처로 집어 들였다. 그 잘못된 정정이 묶음 3까지 이어져 Figma 컴포넌트가 만들어졌다.

같은 문단이 말한 **"미사용 4개"** — `UserAvatar` · `UserLink` · `StatusTabFilter` · `DeleteConfirmDialog` — 는 **전부 맞았다.** 이번에 그 넷을 포함해 지웠다.

> **한 번 더 세는 것이 항상 더 정확한 게 아니다.** 다시 셀 때는 *다른 방법*으로 세야 하고, 두 결과가 갈리면 **어느 쪽이 무엇을 가리키는지**를 확인해야 한다. 여기서는 "export 이름" 이라는 더 정교해 보이는 방법이 오히려 로컬 정의를 끌어들였다.

### 2.3 묶음 1의 `ghost` 오판과 같은 계열이다

| | 묶음 1 | 묶음 3 |
|---|---|---|
| 무엇 | `ghost` variant | `shared/ui/badge` |
| 잘못 센 결과 | "쓰인 적 없음" (실제 18건) | "1곳 사용" (실제 0건) |
| 원인 | 이름만 맞춰 세고 **그 이름이 무엇을 가리키는지 안 봤다** | 같음 |
| 방향 | 살아있는 걸 죽었다고 봄 | 죽은 걸 살았다고 봄 |

**같은 실수가 양방향으로 한 번씩 났다.**

### 2.4 이번엔 import 경로로 판정했다

```
1) 절대경로  from '@/shared/ui/badge'
2) 상대경로  from './badge'  ·  from '../badge'
3) 배럴      해당 폴더의 index 재export
```

셋 다 0이면 죽은 것으로 본다. **JSX 태그 이름은 판정 근거로 쓰지 않는다** — 로컬 정의와 구분되지 않기 때문이다.

> **재발 방지:** 컴포넌트 사용량은 **import 경로**로 센다. 이름 매칭은 후보를 좁히는 데만 쓰고, 판정은 import 로 한다.

---

## 3. 지운 것 13개 (875줄)

| 파일 | 줄 | 비고 |
|---|---:|---|
| `shared/ui/badge.tsx` | 46 | **Figma 컴포넌트도 함께 내렸다** |
| `shared/ui/user-avatar.tsx` | 143 | 2026-07-23 "모노그램 아바타 표시" 커밋으로 개선됐으나 화면에 연결된 적 없음 |
| `shared/ui/user-link.tsx` | 52 | |
| `shared/ui/DeleteConfirmDialog.tsx` | 55 | `alert-dialog` 를 쓰던 래퍼 |
| `shared/ui/StatusTabFilter.tsx` | 87 | |
| `features/auth/ui/LogoutButton.tsx` | 61 | |
| `features/book/ui/BookCard.tsx` | 15 | 라운드 3에서 발견 |
| `features/book/ui/BookCardCover.tsx` | 28 | 이름이 표지인데 도메인 셰이프를 안 썼다 |
| `features/book/ui/BookCardInfo.tsx` | 112 | |
| `features/book/ui/BookCardSkeleton.tsx` | 48 | |
| `features/stats/ui/CategoryBarChart.tsx` | 91 | 2026-06-24 교훈의 그 컴포넌트 계열 |
| `features/stats/ui/ReadingGoalProgress.tsx` | 107 | 묶음 4가 `Progress` description 의 근거로 인용했던 파일 |
| `widgets/landing/ui/ComingSoon.tsx` | 30 | |

**전부 git 추적 중임을 삭제 전에 확인했다** — 필요하면 되살릴 수 있다. (미추적 파일 삭제는 영구 소멸이다)

---

## 4. 문서 정정

지운 컴포넌트를 근거로 적은 문장이 두 곳 있다. **과거 문서를 덮어쓰지 않는다** — 왜 틀렸는지가 사라지기 때문이다. 여기에 정정을 남긴다.

| 문서 | 문장 | 정정 |
|---|---|---|
| 묶음 2~4 스펙 §4.3 | *"`Badge` — variant 4"* | `shared/ui/badge` 는 죽은 코드였다. Figma 에서도 내렸다 |
| 묶음 2~4 스펙 §6.8 | Figma 컴포넌트 **23개** | `Badge` 를 내려 **22개** |
| 묶음 4 스펙 §5.3 | *"앱은 `className='h-3'` 로 높이를 덮어쓴다(`ReadingGoalProgress.tsx:89`)"* | 그 파일도 죽은 코드였다. `Progress` 의 실사용처는 현재 **0곳**이다 |

> `Progress` 는 Figma 에 남긴다. 코드에 살아있는 컴포넌트이고(`shared/ui/progress.tsx` 는 지우지 않았다) 쓰는 화면이 생기면 바로 필요하다. **`badge` 와 다른 점은 컴포넌트 자체가 죽었느냐다.**

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` | **0** — 끊긴 import 가 하나도 없다는 컴파일러의 확증 |
| vitest | **200개 통과** (main 과 동일) |
| 프로덕션 빌드 | **성공** |
| Figma 컴포넌트 | 23 → **22** (`Badge` 제거) |
| 노드 겹침 | **0** |

> **`tsc` 0 이 이 작업의 핵심 근거다.** 참조가 하나라도 남아 있으면 타입 검사가 즉시 터진다. grep 으로 "0건" 을 세는 것보다 강한 증거다.

---

## 6. 하지 않는 것

- **남은 `shared/ui` 25개** — 삭제 후 다시 판정했더니 죽은 것이 하나도 없다. 묶음 1이 기록한 "미사용 4개" 는 전부 맞았고 이번에 지웠다(§2.2).
- **`app/` 라우트 파일** — 파일 기반 라우팅이라 import 되지 않는 것이 정상이다. 판정 대상에서 제외했다.
- **배럴·타입·미들웨어** — `index.ts`, `types/supabase.ts`, `config/supabase/middleware.ts` 등은 import 판정으로는 죽어 보이지만 다른 경로로 쓰인다. 이번 범위가 아니다.
- **`Progress` Figma 컴포넌트** — §4 참조.

---

## 7. 남은 잔여

- `Toast` 의 success/warning 을 primitive 직접 바인딩에서 semantic 으로 승격 (라운드 4에서 넘김)
- `switch` 의 `h-[1.15rem]`(18.4px) 토큰화
- Code Connect (Org/Enterprise 플랜이면)
