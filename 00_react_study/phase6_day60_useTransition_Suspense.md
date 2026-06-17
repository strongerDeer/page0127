# Day 60 — useTransition + Suspense (전환 중 이전 내용 유지)

> Day 59의 `useTransition`을 Suspense와 조합한다. 핵심 한 줄:
> **transition으로 감싼 업데이트가 데이터를 기다리는 동안, React는 fallback 대신 "이전 내용"을 유지한다.**

---

## 1. 오늘 읽을 코드

- [dashboard/page.tsx](<../apps/page0127/app/(protected)/dashboard/page.tsx>) — `<Suspense>`로 캘린더를 별도 스트리밍
- [CalendarSection.tsx](../apps/page0127/src/widgets/dashboard/CalendarSection.tsx) — Suspense 안에서 자기 데이터를 직접 `await`

---

## 2. 핵심 개념

### 2-1. Suspense는 "발동 시점"이 두 가지다

| 시점 | 무슨 일 | 화면 |
| --- | --- | --- |
| **초기 마운트** | 컴포넌트가 처음 데이터를 기다림 | `fallback` 표시 (보여줄 게 없으니까) |
| **업데이트(전환)** | 이미 보이던 내용 → 새 데이터로 교체 | 기본은 **다시 `fallback`으로** (= 깜빡임 😖) |

page0127의 캘린더는 **초기 마운트** 케이스 — 첫 로딩 때 스켈레톤을 보여준다.
문제는 두 번째다. 탭/필터를 바꿔 데이터를 새로 기다릴 때마다 화면이 스켈레톤으로 **되돌아가면** 깜빡인다.

### 2-2. `useTransition`이 그 깜빡임을 막는다

전환(업데이트)을 `startTransition`으로 감싸면, React는 **새 데이터가 준비될 때까지 이전 내용을 그대로 둔다.**
`fallback`은 "보여줄 이전 내용이 아예 없을 때(초기)"만 쓰고, 전환 중엔 생략한다.

```tsx
const [tab, setTab] = useState('reading');
const [isPending, startTransition] = useTransition();

const selectTab = (next: string) => {
  startTransition(() => setTab(next)); // 전환을 transition으로 표시
};

// 탭 내용은 Suspense로 감싸고, 내부에서 use()/async로 데이터를 읽는다
<Suspense fallback={<Skeleton />}>
  <TabContent tab={tab} />
</Suspense>
```

- `startTransition` **없이** `setTab` → 탭 바꿀 때마다 `<Skeleton>` 깜빡
- `startTransition`으로 감싸면 → **이전 탭 내용 유지** + `isPending`으로 "로딩 중" 흐림 표시

> 왜 되나: transition은 "급하지 않은 업데이트"라, React가 새 화면이 준비될 때까지
> 현재 화면을 계속 보여줄 여유를 갖는다. (Day 59의 "interruptible"과 같은 원리)

---

## 3. page0127 실제 사례

### 사례 A — 초기 스트리밍 Suspense (현재 구조)

[dashboard/page.tsx:72-76](<../apps/page0127/app/(protected)/dashboard/page.tsx#L72-L76>):

```tsx
calendarSlot={
  <Suspense fallback={<CalendarBlockSkeleton />}>
    <CalendarSection userId={user!.id} />
  </Suspense>
}
```

[CalendarSection](../apps/page0127/src/widgets/dashboard/CalendarSection.tsx)은 **자기 데이터를 직접 `await`** 하는 async Server Component다.
→ 페이지 본체(통계·책 목록)는 먼저 그려지고, **캘린더 쿼리만 끝나면 그 부분만 늦게 스트리밍**된다.
이게 Suspense의 "초기 마운트" 활용 — 느린 부분이 빠른 부분을 막지 않게 한다.

### 사례 B — 정확한 조합은 없음, 단 "같은 문제"는 캘린더에 실재 (검증 결과)

오늘의 조합(`useTransition` + `Suspense`)이 그대로 들어맞는 곳은 page0127에 **없다.**
데이터 로딩용 `use()`/`useSuspenseQuery`가 없기 때문 (`use()`는
[edit/page.tsx](<../apps/page0127/app/(protected)/books/[id]/edit/page.tsx>)의 `params` 언래핑에만 사용).

- 상태 탭([DashboardBookList](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx))은 **클라이언트 필터링** → Suspense 없음, 이미 `isPending` 흐림(Day 59).
- 연도 변경([DashboardContent.tsx:266](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L266))은 `router.push` **서버 라우팅** → Next가 전환 처리.

**하지만 같은 UX 문제는 실재한다 — 캘린더 월 이동.**
[CalendarBlock.tsx:78](../apps/page0127/src/widgets/dashboard/CalendarBlock.tsx#L78)은 prev/next로 월을 바꾸면
`queryKey`가 바뀌어 **재페치**하는데(`useQuery` + `isLoading`), `placeholderData: keepPreviousData`가 **없다.**
→ 처음 보는 달로 이동하면 이전 달이 사라지고 로딩으로 **깜빡일 수 있다.**

"전환 중 이전 내용 유지"와 **똑같은 문제지만**, 이 컴포넌트는 이미 `useQuery`를 쓰므로
**해법은 Suspense가 아니라 React Query 방식**이다:

```tsx
import { keepPreviousData } from '@tanstack/react-query';

const { data, isLoading, isPlaceholderData } = useQuery({
  queryKey: [/* ... */, calendarYear, calendarMonth],
  placeholderData: keepPreviousData, // 새 달 로딩 중 이전 달을 유지
  // ...
});
// isPlaceholderData로 흐림 → "유지하되 로딩 중" 표시 (= isPending 흐림의 RQ 버전)
```

> 💡 정리: **"Suspense 데이터엔 `useTransition`, React Query 데이터엔 `keepPreviousData`."**
> 둘 다 "전환 중 이전 내용 유지"라는 같은 목표의, 라이브러리별 도구다.

---

## 4. 정리

| 상황 | fallback 뜸? |
| --- | --- |
| 초기 마운트 (보여줄 이전 내용 없음) | ✅ 뜸 |
| 일반 업데이트 (transition 없이) | ✅ 다시 뜸 → 깜빡임 |
| **`startTransition`으로 감싼 업데이트** | ❌ 안 뜸 → **이전 내용 유지** + `isPending` 흐림 |

> 규칙 한 줄: **"초기엔 `Suspense` fallback, 전환엔 `useTransition`으로 fallback을 억제하고 이전 내용을 유지."**

---

## 5. 오늘 실험 (2가지)

1. **fallback 깜빡임 재현 → transition으로 제거**
   임시 페이지에 `use(fetchPromise)`로 데이터를 읽는 컴포넌트를 `<Suspense fallback>`으로 감싸고,
   탭/월을 바꾸는 버튼을 둔다. (a) `setTab(next)` 직접 vs (b) `startTransition(() => setTab(next))`로
   전환 → fallback이 깜빡이는지 / 이전 내용이 유지되는지 비교.

2. **isPending 흐림 붙이기**
   위 실험 (b)에서 `isPending`으로 이전 내용에 `opacity: 0.6`을 줘서
   "유지하되 로딩 중임을 표시"하는 UX를 만들어본다. (page0127의
   [isTabPending 흐림](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L287) 패턴과 동일)

---

## 6. 다음 Day 예고

**Day 61 — Suspense 중첩 패턴**: 책장 / 통계 / 알림을 **각각 독립된 Suspense 경계**로 감싸
일부가 느리거나 실패해도 나머지는 먼저 보여주는 구조. 오늘의 단일 Suspense(캘린더)를
여러 경계로 나누면 어떻게 달라지는지 다룬다.
