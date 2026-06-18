# Day 62 — Error Boundary 심화 (중첩 경계 + reset)

> Phase 6 · 주제: 중첩 Error Boundary와 reset 버튼 / page0127 연결: **API별 에러 복구 UX**

---

## 1. 오늘 읽을 코드

- [ErrorBoundary.tsx](../apps/page0127/src/shared/ui/ErrorBoundary.tsx) — 직접 만든 Class 기반 경계
- [error.tsx](../apps/page0127/app/error.tsx) — Next.js 파일 규칙 에러 페이지

---

## 2. 핵심 개념

### 2-1. Error Boundary는 왜 아직 Class인가

React 19에도 **함수형 Error Boundary는 없다.** 에러를 캐치하려면 클래스의 두 라이프사이클이 필요한데, 이걸 대체할 훅이 안 나왔기 때문이다.

```tsx
// 렌더 단계: 에러를 받아 fallback 상태로 전환 (UI 갱신)
static getDerivedStateFromError(error: Error) {
  return { hasError: true, error };
}

// 커밋 단계: 부수효과(로깅) 전용 — Sentry 전송 등
componentDidCatch(error, errorInfo) {
  console.error(error, errorInfo);
}
```

> 둘의 역할 분리가 포인트다. `getDerivedStateFromError`는 **무엇을 보여줄지**(순수), `componentDidCatch`는 **무엇을 기록할지**(부수효과).

### 2-2. 캐치하는 것 / 못 하는 것

| 잡힌다 ✅ | 못 잡는다 ❌ |
| --- | --- |
| 하위 컴포넌트 **렌더링** 중 에러 | 이벤트 핸들러 (`onClick` 내부) |
| 라이프사이클 메서드 에러 | `setTimeout`/`Promise` 등 비동기 |
| 생성자 에러 | 자기 자신(Boundary)의 에러 |

→ 이벤트/비동기 에러는 `try/catch`나 `useState`로 직접 처리해야 한다. Error Boundary는 **렌더링 에러 전용**이다.

### 2-3. reset의 두 갈래

| 방식 | 동작 | 위치 |
| --- | --- | --- |
| `handleReset` (직접 구현) | `setState`로 `hasError=false` → **다시 렌더 시도** | ErrorBoundary.tsx:52 |
| `reset()` (Next.js 제공) | 해당 세그먼트를 **재렌더(refetch 포함)** | error.tsx:57 |

핵심: reset은 "에러 상태만 푼다." 원인이 그대로면 다시 터진다. 그래서 **일시적 에러**(네트워크 깜빡임)에 의미가 있고, 영구 에러엔 "홈으로" 같은 탈출구가 같이 필요하다.

### 2-4. 중첩 Error Boundary — 폭발 반경 줄이기

경계는 **가장 가까운 상위 Boundary**가 잡는다. 그래서 경계를 잘게 두면 한 영역이 죽어도 나머지는 산다. (Day 61의 Suspense 중첩과 같은 철학 — `[[격리]]`.)

```tsx
<ErrorBoundary fallback={<PageError />}>      {/* 바깥: 최후의 보루 */}
  <Header />
  <ErrorBoundary fallback={<BookListError />}> {/* 안쪽: 책장만 격리 */}
    <BookList />                                {/* 여기 터져도 Header·통계는 생존 */}
  </ErrorBoundary>
  <ErrorBoundary fallback={<StatsError />}>
    <Stats />
  </ErrorBoundary>
</ErrorBoundary>
```

### 2-5. 경계를 쪼개는 기준 (설계)

"잘게 = 항상 좋다"는 **틀렸다.** 트레이드오프가 있다.

| 너무 크게 (경계 1개) | 너무 잘게 (경계 남발) |
| --- | --- |
| 한 군데 터지면 페이지 전체 사망 | 보일러플레이트 폭발, fallback 관리 부담 |
| 통계 깨졌다고 책장도 못 봄 | 안 터지는 곳까지 감싸 코드만 늘어남 |

정답은 "잘게"가 아니라 **"실패 단위에 맞춰서"**다. 판단 질문은 딱 하나:

> **"이 영역이 죽어도, 나머지 화면이 사용자에게 말이 되는가?"**
> · Yes → 경계로 감싸 격리 · No → 상위 경계에 맡김

**"API 기반 vs 컴포넌트 단위"는 대립이 아니다.** 경계는 결국 *같이 실패하느냐*를 따라가므로 보통 일치한다.

```tsx
// 같은 API에서 오는 데이터 = 같이 실패 = 한 경계
//   책 상세: 제목·표지·설명 모두 GET /books/[id] → 경계 1개로 충분
// 다른 API = 따로 실패 = 다른 경계
//   대시보드: /books·/stats·/notifications → 각각 경계
```

→ 자연스러운 경계 단위 = **"독립적으로 데이터를 fetch하는 컴포넌트"**. 이게 `fallback` prop을 영역마다 다르게 주는 이유다.

**쪼개지 말아야 할 곳:** 데이터 없는 순수 UI(버튼·레이아웃, 거의 안 터짐), 한 덩어리로만 의미 있는 것(결제 폼 — 일부만 살면 위험).

### 2-6. 영역에 에러 났을 때 — 복구 3단계

fallback을 "오류 발생"으로 끝내지 말고 단계로 설계한다.

```tsx
// 1단계 재시도(reset) — 일시적 에러(네트워크 깜빡임)에만 효과
<Button onClick={reset}>다시 시도</Button>
// 2단계 대체 콘텐츠 — 이전 캐시·빈 상태로 graceful degradation
<EmptyBookList message="목록을 잠시 못 불러왔어요" />
// 3단계 탈출구 — 원인이 영구적일 때
<Button onClick={() => location.assign('/')}>홈으로</Button>
```

> reset은 "원인"을 못 고친다 → 일시적 에러엔 1단계, 영구 에러엔 3단계. **항상 탈출구를 함께 둔다.**

---

## 3. page0127 실제 코드 사례

### 두 경계의 역할이 갈린다

page0127엔 에러 처리 장치가 **두 층**으로 존재한다.

```tsx
// app/error.tsx — 라우트 세그먼트 전체를 덮는 광역 그물
//  · SSR/CSR 에러 모두 캐치, error.digest로 서버 에러 추적
//  · 단, layout.tsx 에러는 못 잡음 → global-error.tsx 영역
export default function Error({ error, reset }) { ... }
```

```tsx
// shared/ui/ErrorBoundary.tsx — 컴포넌트 단위로 꽂는 국소 그물
//  · <ErrorBoundary><Widget/></ErrorBoundary> 처럼 부분 격리용
//  · fallback prop으로 영역별 다른 에러 UI 주입 가능
<ErrorBoundary fallback={<위젯전용에러 />}>
```

**fallback prop이 API별 복구 UX의 열쇠다.** 같은 ErrorBoundary라도 책장엔 "책 목록을 못 불러왔어요", 통계엔 "통계 일시 오류"처럼 **API 맥락에 맞는 메시지·재시도**를 끼워넣을 수 있다.

### 개발/운영 분기

두 파일 모두 `process.env.NODE_ENV === 'development'`일 때만 `error.message`를 노출한다 (ErrorBoundary.tsx:78, error.tsx:44). 운영에선 raw 에러를 사용자에게 안 보여주는 안전장치다.

### 실전 리팩토링 — 이번에 page0127에 적용한 것 (Day 63 선행)

**① Suspense + Error Boundary 짝짓기.** (public)·dashboard의 데이터 영역을 경계로 감쌌다. 순서는 **EB(바깥) > Suspense(안)** — 에러는 EB, 로딩은 Suspense가 잡는다.

```tsx
// app/(public)/page.tsx — 랭킹마다 독립 경계 (하나 죽어도 나머지 생존)
<ErrorBoundary fallback={<BookRankingError title='🏆 인생책' />}>
  <Suspense fallback={<BookRankingListSkeleton />}>
    <BookRankingSection type='best' ... />   {/* Server Component */}
  </Suspense>
</ErrorBoundary>
```

- **Skeleton(로딩) ↔ Error(실패) ↔ Section(성공) 3상태 대칭** — 같은 외곽 유지로 CLS 방지. fetch 단위 = Suspense 단위 = EB 단위가 한 몸.
- **client EB가 Server Component를 children으로** 감싸는 composition 패턴.
- "다시 시도"는 `router.refresh()` — Server 데이터 에러는 `setState` reset만으론 재요청이 안 되므로(2-6의 복구 단계).

**② ErrorFallback 추출 (DRY).** `error.tsx`와 `ErrorBoundary`가 거의 같은 fallback을 복붙하고 있어 `shared/ui/ErrorFallback`로 합쳤다. 둘의 차이는 **2차 동선뿐**(홈으로 ↔ 새로고침) → `secondaryLabel`/`onSecondary` prop으로만 분기.

```tsx
// error.tsx
<ErrorFallback error={error} onRetry={reset}
  secondaryLabel='홈으로' onSecondary={() => (location.href = '/')} />
// ErrorBoundary 기본 fallback
<ErrorFallback error={this.state.error} onRetry={this.handleReset}
  secondaryLabel='페이지 새로고침' onSecondary={() => location.reload()} />
```

---

## 4. 규칙 한 줄

> **Error Boundary = 렌더링 에러 전용 그물. 경계는 잘게 중첩해 폭발 반경을 줄이고, fallback prop으로 API별 복구 UX를 입힌다. reset은 일시적 에러에만 의미 있으니 항상 탈출구(홈으로)를 함께 둔다.**

---

## 5. 오늘 실험 (2가지)

### 실험 1 — 중첩 경계 격리 확인

`BookList` 내부에서 일부러 `throw new Error('책 목록 에러')`를 던져보고, **바깥 Header/통계가 살아있는지** 확인한다.

```tsx
// 책장만 ErrorBoundary로 감쌌을 때 vs 안 감쌌을 때 비교
<ErrorBoundary fallback={<p>책장만 죽음</p>}>
  <BookList />  {/* throw 발생 */}
</ErrorBoundary>
<Stats />        {/* ← 살아있어야 정상 */}
```

→ 경계를 제거하면 page0127의 `app/error.tsx`까지 에러가 올라가 **페이지 전체가 fallback**이 되는 걸 눈으로 확인.

### 실험 2 — reset이 "원인"은 못 고친다 증명

`reset()` / `handleReset`을 눌러도 **에러 원인이 그대로면 즉시 재발**하는 걸 확인한다.

```tsx
// 항상 throw → reset 눌러도 무한 반복
<ErrorBoundary>
  <AlwaysThrow />
</ErrorBoundary>

// vs 카운터로 "두 번째엔 성공" → reset이 회복시키는 케이스
let count = 0;
const SometimesThrow = () => {
  if (count++ === 0) throw new Error('첫 시도 실패');
  return <p>두 번째엔 성공 ✅</p>;
};
```

→ reset의 가치는 **"일시적 에러 회복"**에 있음을 체감.

---

## 6. 다음 Day 예고

**Day 63 — Suspense + Error Boundary 조합**: 로딩(Suspense)과 에러(Error Boundary)를 한 경계에 겹쳐, "로딩 중 / 성공 / 실패" 세 상태를 한 영역에서 처리하는 패턴. `[[격리]]` 철학의 완성편.
