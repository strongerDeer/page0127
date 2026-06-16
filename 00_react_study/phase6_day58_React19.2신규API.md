# Day 58 — React 19.2 신규 API: `<Activity>` + `useEffectEvent`

> Phase 6 첫날. 주제: 화면을 "숨겨도 살려두기"(`<Activity>`)와
> "Effect는 그대로, 최신 값만 읽기"(`useEffectEvent`).
> 연결 포인트: 대시보드 탭/Effect에 적용 가능성 검토.

---

## 1. 오늘 읽을 코드

- [StatusTabFilter.tsx](../apps/page0127/src/shared/ui/StatusTabFilter.tsx) — 상태 탭 (Compound)
- [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — 탭 + `useEffect` 2개
- [DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — `useCallback`으로 참조 안정화하는 부분

---

## 2. 핵심 개념

> ⚠️ **둘은 남남이다.** 같은 React 19.2 신규 API라 함께 배울 뿐, 목적은 완전히 다르다.
> `<Activity>`는 **화면을 숨겼다 살리는 컴포넌트**, `useEffectEvent`는 **`useEffect` 재실행을 막는 훅**.
> 굳이 공통점은 "둘 다 Effect 생명주기와 엮인다" 정도 — **따로 이해하면 된다.**

### 2-1. `<Activity>` — 안 보이게 두되, 죽이지는 않기

React 19.2 신규 컴포넌트. 자식을 **마운트한 채로 화면에서만 숨긴다**.
숨김(`hidden`) 상태에서는 Effect를 정리(cleanup)하고 렌더 우선순위를 낮추지만,
**state는 그대로 보존**된다. 다시 `visible`로 바꾸면 그 상태에서 이어진다.

```tsx
import { Activity } from 'react'; // React 19.2부터 정식 (unstable_ 접두사 불필요)

// 탭 3개를 전부 마운트하되, 현재 탭만 visible
<Activity mode={tab === 'all' ? 'visible' : 'hidden'}>
  <AllBooks />
</Activity>
<Activity mode={tab === 'completed' ? 'visible' : 'hidden'}>
  <CompletedBooks />
</Activity>
```

조건부 렌더링(`{tab === 'all' && <AllBooks />}`)과의 차이:

| 방식 | 탭 떠날 때 | 다시 올 때 |
| --- | --- | --- |
| `&&` 조건부 | **언마운트** (state·스크롤 소실) | 처음부터 다시 마운트 |
| `<Activity hidden>` | DOM만 숨김, **state 보존** | 즉시 복원 (프리렌더됨) |

> 핵심: "탭마다 컴포넌트가 다르고, 떠났다 와도 입력값·스크롤을 유지하고 싶다" → `<Activity>`.

### 2-2. `useEffectEvent` — deps 거짓말 안 하고 최신 값 읽기

Effect 안에서 **최신 props/state를 읽어야 하지만, 그 값 때문에 Effect를 재실행하긴 싫을 때** 쓴다.
"Effect Event"는 항상 최신 값을 보지만, **deps에 넣지 않는다(넣으면 안 된다)**.

```tsx
import { useEffectEvent } from 'react'; // React 19.2부터 정식 (experimental_ 접두사 불필요)

// onClose는 매 렌더 새 함수일 수 있다 → Effect Event로 감싸 "최신 참조"만 사용
const onCloseEvent = useEffectEvent(() => onClose());

useEffect(() => {
  const t = setTimeout(onCloseEvent, 3000); // 최신 onClose를 봄
  return () => clearTimeout(t);
}, []); // onClose를 deps에 안 넣어도 lint 통과 + 항상 최신
```

기존 우회법과 비교:

| 우회법 | 문제 |
| --- | --- |
| deps에 `onClose` 추가 | onClose 바뀔 때마다 Effect 재실행 (타이머 리셋) |
| 부모가 `useCallback`으로 안정화 | **부모에 책임 전가** — 자식 사정 때문에 부모가 감싸야 함 |
| `useRef`에 최신 값 보관 | 보일러플레이트 + 직접 동기화 |
| **`useEffectEvent`** | 자식이 스스로 해결, deps 정직하게 유지 |

> ⚠️ **"deps 경고 뜨면 `useEffectEvent`로 끄면 됨"은 위험한 오해.** 경고는 대부분 정당하다.
> 판단 순서:
> 1. 그 값이 바뀌면 effect를 **다시 실행해야 하나?** → YES면 그냥 deps에 넣어라 (경고가 맞음)
> 2. 재실행은 싫은데 **최신 값은 읽어야** 하나? → **그때만** `useEffectEvent`
>
> 함수가 deps에 걸려 뜨는 경고는 먼저 **effect 안으로 옮기거나 컴포넌트 밖으로 빼는** 걸 검토.
> `useEffectEvent`로 경고를 막으면, 원래 반응해야 할 값이었을 때 **버그가 조용히 숨는다.**
> (19.2부터 ESLint `exhaustive-deps`가 effect event를 인식 → 정상 사용 시 거짓 경고 없음)

---

## 3. page0127 실제 사례

### 사례 A — `useEffectEvent`가 풀 수 있는 "참조 안정화" 부담

[DashboardContent.tsx:223-224](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L223-L224):

```tsx
// ReadingGoalDialog의 useEffect deps에 들어가므로 참조를 안정화 (useCallback)
const handleGoalClose = useCallback(() => setIsGoalDialogOpen(false), []);
const handleGoalSuccess = useCallback(() => router.refresh(), [router]);
```

지금은 **자식(`ReadingGoalDialog`)의 Effect deps 때문에 부모가 `useCallback`을 쓴다.**
이게 바로 2-2의 "부모에 책임 전가" 케이스다.

`ReadingGoalDialog` 내부에서 `onClose`를 `useEffectEvent`로 감싸면,
deps에서 빼도 lint가 통과하고 항상 최신 함수를 본다.
→ 그러면 부모는 `useCallback` 없이 그냥 `() => setIsGoalDialogOpen(false)`를 넘겨도 된다.

> 정리: `useEffectEvent`는 "콜백 참조 안정화"의 책임을 **콜백을 쓰는 쪽(자식)** 으로 되돌린다.

### 사례 B — keydown 리스너: 지금은 OK, 언제 필요해지나

[DashboardBookList.tsx:136-142](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L136-L142):

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') searchRef.current?.clear();
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []); // ref만 읽으므로 deps 비어도 안전
```

지금은 `searchRef`(ref)만 읽어서 `deps: []`로도 항상 최신이다 → **useEffectEvent 불필요.**
하지만 만약 Escape 시 **`onSearchChange(query)` 같은 props를 호출**해야 한다면?
deps에 `onSearchChange`를 넣으면 그 함수가 바뀔 때마다 리스너를 재등록한다.
이때 핸들러를 `useEffectEvent`로 감싸면 **리스너는 한 번만 등록, 호출 시 최신 props 사용.**

### 사례 C — `<Activity>`는 현재 탭 구조엔 "아직" 불필요

[StatusTabFilter.tsx](../apps/page0127/src/shared/ui/StatusTabFilter.tsx) + [DashboardBookList.tsx:284-295](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L284-L295):

현재 상태 탭은 **컴포넌트를 갈아끼우는 게 아니라, 같은 `filteredBooks`를 `statusFilter`로 거르는 방식**이다
(289-295줄). 탭이 바뀌어도 `DashboardBookList` 자체는 언마운트되지 않으므로
입력값·페이지 상태가 이미 보존된다 → `<Activity>` 이득이 없다.

`<Activity>`가 빛나는 시점: **탭마다 완전히 다른 무거운 화면**(예: 대시보드 / 캘린더 / 통계 탭)을
오가는데, 떠났다 와도 스크롤·필터·차트 상태를 유지하고 싶을 때.
지금 page0127의 `DashboardContent`는 한 화면에 다 펼치는 구조라 해당 없음 — **추후 탭 분리 시 후보.**

#### 탭 vs 페이지(라우팅) — 무거운 화면을 어디에 둘까

"무겁다"를 먼저 둘로 나눈다:

- **번들이 무겁다** → 탭이든 페이지든 `dynamic import`로 코드 스플리팅
  (page0127은 이미 [DashboardContent.tsx:44](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L44)에서 차트를 분리)
- **다시 그리는 게 무겁다**(재계산·재패칭·스크롤 소실) → 여기서 `<Activity>`가 값을 함

별도 페이지로 가면 떠나는 순간 **언마운트**된다 → 무거운 화면일수록 돌아올 때 비용이 큼.
자주 왕복한다면 오히려 `<Activity hidden>`으로 살려두는 게 이득(전환 즉각 + 프리렌더).
즉 "무겁다"는 페이지로 쪼갤 이유가 아니라, **탭으로 살려둘 이유**가 되기도 한다.

| 상황 | 선택 |
| --- | --- |
| 독립적 "장소" — 공유·북마크·딥링크·뒤로가기 필요 | **별도 페이지** (`/dashboard`, `/calendar`) |
| 한 번 보면 잘 안 돌아옴 / 전환이 드묾 | **별도 페이지** or 조건부 렌더링 |
| 같은 맥락의 여러 뷰 + 입력·스크롤·필터 유지 중요 | **탭 + `<Activity>`** |
| 무거워도 탭 누르면 즉시 떠야 함 | **탭 + `<Activity>`** (프리렌더) |

> 한 줄: **"별개의 장소면 페이지, 같은 작업의 여러 뷰면 탭."**
> page0127은 공유 URL(`/{username}`) 중심이라 오히려 **페이지 라우팅이 자연스러운** 케이스.

### 사례 D — Drawer / 모달에 적용한다면?

드로어·사이드 패널·모달은 "열렸다 닫혔다" 하니 Activity가 어울려 보이지만,
**여닫는 동안 내부 state를 이어갈 가치가 있을 때만** 이득이 있다.
(닫혀 있는 동안 안의 Effect는 cleanup되니 자원도 아낀다.)

| Drawer 내용 | 닫았다 열 때 바라는 것 | 선택 |
| --- | --- | --- |
| 무거운/멀티스텝 폼, 입력하다 닫음 | 입력값·진행 단계 유지 | **`<Activity>`** |
| 필터 패널, 자주 여닫음 | 설정 중 필터 유지 + 즉시 표시 | **`<Activity>`** |
| 장바구니·알림 목록, 자주 여닫음 | 스크롤·상태 유지 | **`<Activity>`** |
| 확인 다이얼로그 (한 번 결정하고 끝) | 매번 초기 상태 | 조건부 렌더링 |
| 가벼운 메뉴 드로어 | 매번 새로 | 조건부 렌더링 |

page0127 대입:

- `ReadingGoalDialog`(목표 입력) → 닫았다 열면 보통 **현재 목표값으로 재초기화**가 자연스러움 → Activity 이득 적음.
  단, "입력하다 실수로 닫아도 다시 열면 그대로"를 원하면 후보.
- `AlertDialog`(취향 분석 확인, [DashboardContent.tsx:520](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L520)) → 한 번 결정하고 끝 → **조건부 렌더링이 맞음**.

> 주의: shadcn/Radix 같은 라이브러리는 애니메이션용으로 이미 DOM 유지·`forceMount`를 제공한다.
> Activity 도입 전, 쓰는 라이브러리가 이미 state를 보존하는지부터 확인할 것.

핵심 한 줄: **"여닫아도 안에서 하던 작업을 이어가야 하면 `<Activity>`, 매번 새로 시작이면 조건부 렌더링."**

---

## 4. 규칙 한 줄

> **`useEffectEvent`** = "Effect는 재실행 말고, 값만 최신으로" (deps에 절대 안 넣음) ·
> **`<Activity>`** = "탭을 떠나도 컴포넌트 state를 살려둘 때".

---

## 5. 오늘 실험 (2가지)

1. **`useEffectEvent`로 `useCallback` 제거 실험**
   `ReadingGoalDialog`의 `onClose`/`onSuccess`를 `useEffectEvent`로 감싸고,
   [DashboardContent.tsx:223-224](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L223-L224)의
   `useCallback`을 평범한 화살표 함수로 바꿔본다 → Effect가 불필요하게 재실행되는지 확인.

2. **`<Activity>` 미니 탭 실험**
   임시 페이지에 탭 2개를 `<Activity mode={...}>`로 감싸고, 각 탭에 `<input>` 하나씩 둔다.
   탭을 왕복하며 (a) `&&` 조건부 (b) `<Activity hidden>` 두 방식의 **입력값 유지 차이**를 비교.

---

## 6. page0127 전수 검사 결과 (Activity / useEffectEvent)

> 요청으로 page0127 전체를 전수 조사 (서브에이전트 2개 병렬). 조사 단계에선 후보만 추렸고,
> `useEffectEvent` 권장 3건은 이후 실제 반영했다 (아래 **✅ 실제 적용 완료** 표 참조).

### `useEffectEvent` — 진단 (높음) → 아래 ✅ 모두 반영 완료

구독/옵저버 setup이 **상태 변화마다 끊겼다 다시 붙던** 전형적 케이스.
(아래 라인 번호는 **진단 시점(적용 전)** 기준 — 반영 후 현재 위치는 **✅ 실제 적용 완료** 표를 보라.)

| 위치 | 진단 (적용 전) | 처방 |
| --- | --- | --- |
| [ActivityFeed.tsx:43](../apps/page0127/src/widgets/activity/ui/ActivityFeed.tsx#L43) | 무한스크롤 `IntersectionObserver`, deps `[fetchNextPage, hasNextPage, isFetchingNextPage]` → 페칭 상태 바뀔 때마다 observer 재생성 | 콜백을 `onIntersect = useEffectEvent(...)`로 빼고 effect deps `[]` |
| [NotificationPage.tsx:77](../apps/page0127/src/features/notification/ui/NotificationPage.tsx#L77) | 위와 동일한 무한스크롤 옵저버 | 동일 |
| [FollowStats.tsx:39](../apps/page0127/src/features/follow/ui/FollowStats.tsx#L39) | `BroadcastChannel` 구독, `queryClient` 읽으려고 `// eslint-disable exhaustive-deps`로 우회 | 콜백을 effect event로 → **disable 주석 제거 + deps `[]` 정당화** |

### `useEffectEvent` — 검토 가치 (중간, "정리" 성격)

- [ReadingGoalDialog.tsx:76](../apps/page0127/src/features/profile/ui/ReadingGoalDialog.tsx#L76) ↔ [DashboardContent.tsx:223](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L223) — **사례 A**에서 본 `useCallback` 짝. 자식에 적용하면 부모 `useCallback` 2개 제거 (버그는 아님).
- [stats/BookSearchInput.tsx:52](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx#L52) · [book/BookSearchInput.tsx:45](../apps/page0127/src/features/book/ui/BookSearchInput.tsx#L45) — 디바운스 검색, `onSearchChange`(props)가 deps에 걸려 타이머 setup 재생성.

### `<Activity>` — 재검토 결과: 부적합 ⚠️ (정적 분석은 "높음"이었으나 코드 확인 후 철회)

| 위치 | 정적 분석 기대 | 실제 코드 확인 결과 |
| --- | --- | --- |
| `app/(protected)/books/add/page.tsx:230-293` | 검색↔폼 왕복 시 등록폼 입력 보존 | **부적합** — ① `BookRegistrationForm`은 non-null `book` prop 필수라 `selectedBook=null`일 때 `hidden`으로 둘 수 없음 ② 폼 state는 `useReducer` 초기값으로 마운트 시 1회만 설정 → Activity로 보존하면 **다른 책을 골라도 이전 입력이 잔존**(혼란) ③ "취소 = 입력 폐기"가 자연스러운 UX |

> 💡 교훈: **정적 분석(서브에이전트)은 컴포넌트의 prop 제약·`useReducer` 초기화 동작까지는 못 본다.**
> 적용 전 대상 컴포넌트를 직접 읽어 검증해야 한다. (입력 복원이 정말 필요하면 Activity가 아니라
> state를 부모로 끌어올리거나 임시 저장하는 방식이 적합 — 매번-새로-시작이 맞는 화면엔 조건부 렌더링.)

### `<Activity>` — 검토 가치 (중간/낮음)

- [CommentItem.tsx:222-233](../apps/page0127/src/features/comment/ui/CommentItem.tsx#L222-L233) — 대댓글 폼 토글, 닫으면 작성 중 내용 소실 (짧은 텍스트라 비용 작음).
- [CommentSection.tsx:67-79](../apps/page0127/src/features/comment/ui/CommentSection.tsx#L67-L79) — 댓글 영역 접기/펼치기 안에 작성 폼 포함.

### 결론

- **이 코드베이스는 탭/필터를 "컴포넌트 교체"가 아니라 "동일 컴포넌트 내 필터링 + lift-state up"으로 일관되게 짰다** → `<Activity>` 적용처는 **사실상 없음** (유일 후보였던 books/add도 검증 결과 부적합). 확인 다이얼로그 6종·라우팅 탭바(`BottomTabBar`)도 불필요. → **사례 C**에서 추측한 그대로 확인됨.
- 반면 `useEffectEvent`는 **구독·옵저버 setup 패턴**에서 명확한 적용처 3건 — 모두 반영 완료(아래 ✅). 그중 [FollowStats.tsx:38](../apps/page0127/src/features/follow/ui/FollowStats.tsx#L38)의 `eslint-disable` 우회 제거가 가장 교과서적인 사례.

### ✅ 실제 적용 완료 (코드 수정 + lint/tsc 통과)

| 파일 | 변경 | 검증 |
| --- | --- | --- |
| [FollowStats.tsx](../apps/page0127/src/features/follow/ui/FollowStats.tsx#L38) | 구독 콜백 → `useEffectEvent`, `eslint-disable` 제거 | ESLint 0, tsc 0 |
| [ActivityFeed.tsx](../apps/page0127/src/widgets/activity/ui/ActivityFeed.tsx#L42) | 옵저버 콜백 분리, deps `[hasNextPage]`만 유지 | ESLint 0, tsc 0 |
| [NotificationPage.tsx](../apps/page0127/src/features/notification/ui/NotificationPage.tsx#L76) | 동일 | ESLint 0, tsc 0 |

> ⚠️ deps를 `[]`로 완전히 비우지 **않은** 이유: 무한스크롤 트리거 `<div ref>`가 로딩 후/조건부로
> 마운트되므로, `hasNextPage`를 빼면 옵저버가 그 엘리먼트를 못 잡아 스크롤이 깨진다.

---

## 7. 다음 Day 예고

**Day 59 — useTransition 심화**: 대량 책 렌더링을 Transition으로 끊김 없이 처리.
오늘 본 `DashboardBookList`의 `startTabTransition`(130줄)을 더 깊게 파고든다.
