# Day 61 — Suspense 독립 경계 패턴 (일부 느려도 나머지 먼저)

> Day 60의 단일 Suspense(캘린더)를 여러 개로 나눈다. 핵심 한 줄:
> **경계를 여러 개로 쪼개면 각 영역이 독립적으로 스트리밍된다 → 빠른 건 먼저, 느린 건 그것만 대기.**

---

## 1. 오늘 읽을 코드

- [(public)/page.tsx](<../apps/page0127/app/(public)/page.tsx>) — 두 랭킹을 **각각 별도 Suspense**로 감쌈 (모범 사례)
- [BookRankingSection.tsx](../apps/page0127/src/widgets/book/ui/BookRankingSection.tsx) — 자기 데이터를 직접 `await`하는 async 섹션

---

## 2. 핵심 개념

### 2-1. 경계(boundary)를 어떻게 긋느냐가 전부

| 구조 | 하나가 느리면 |
| --- | --- |
| 페이지에서 **직렬 `await`** | 페이지 **전체**가 대기 (waterfall) |
| **단일 Suspense**로 묶음 | 그 경계 안 **전부** 준비돼야 보임 |
| **독립 Suspense × N** | **그것만** 대기, 나머지는 먼저 그려짐 ✅ |

핵심은 **"데이터를 직접 `await`하는 async 컴포넌트"를 만들고, 부모에서 각각 `<Suspense>`로 감싸는 것.**

```tsx
// 각 섹션이 자기 데이터를 직접 fetch → 서로의 로딩을 안 기다림
<Suspense fallback={<ShelfSkeleton />}>
  <BookShelf />     {/* 자기 쿼리 await */}
</Suspense>
<Suspense fallback={<StatsSkeleton />}>
  <Stats />         {/* 자기 쿼리 await */}
</Suspense>
```

→ 책장 쿼리가 느려도 통계는 먼저 도착한다. (형제 async Server Component는 병렬로 시작됨)

### 2-2. "일부 실패해도 나머지" = Suspense + Error Boundary

Suspense는 **로딩**을 격리한다. **에러**는 Error Boundary가 격리한다.
경계마다 Error Boundary를 함께 두면, 한 섹션이 터져도 다른 섹션은 멀쩡하다.

```tsx
<ErrorBoundary fallback={<ShelfError />}>
  <Suspense fallback={<ShelfSkeleton />}>
    <BookShelf />
  </Suspense>
</ErrorBoundary>
```

> 로딩 격리(Suspense) + 에러 격리(Error Boundary) = 진짜 독립 섹션. (에러 쪽은 **Day 62**에서 깊게)

---

## 3. page0127 실제 사례

### 사례 A — 두 랭킹의 독립 스트리밍 (모범 ✅)

[(public)/page.tsx:79-99](<../apps/page0127/app/(public)/page.tsx#L79-L99>):

```tsx
<Suspense fallback={<BookRankingListSkeleton />}>
  <BookRankingSection type='best' ... />   {/* RPC: get_books_of_life */}
</Suspense>

<Suspense fallback={<BookRankingListSkeleton />}>
  <BookRankingSection type='most' ... />   {/* RPC: get_most_read_books */}
</Suspense>
```

[BookRankingSection](../apps/page0127/src/widgets/book/ui/BookRankingSection.tsx)은 **자기 RPC만 직접 `await`**(line 43)하는 async Server Component다.
→ 두 랭킹이 **병렬로 시작**되고, 끝나는 대로 각자 스트리밍. 하나가 느려도 다른 하나가 안 막힌다.
주석에도 "직렬 await가 아닌 병렬 스트리밍으로 도착"이라 명시.

### 사례 B — 대시보드는 아직 "직렬 await"가 섞여 있음 (개선 여지)

[dashboard/page.tsx:50-57](<../apps/page0127/app/(protected)/dashboard/page.tsx#L50-L57>)은 통계·책 목록을 **페이지에서 직렬 `await`**한다:

```tsx
const overallStats = await getOverallStats(user!.id); // ①
const stats = await getBookStats(user!.id, selectedYear); // ② ①이 끝나야 시작
const { data: allBooks } = await supabase.from('books')...; // ③ ②가 끝나야 시작
```

→ 셋이 **순차**라 합산 시간만큼 페이지 본체가 늦어진다. 캘린더만 [Suspense로 분리](<../apps/page0127/app/(protected)/dashboard/page.tsx#L72-L76>)돼 있을 뿐.
사례 A처럼 **통계/책장을 각각 async 섹션 + 독립 Suspense**로 나누면 병렬 스트리밍이 된다. (오늘의 적용 후보)

---

## 4. 정리

> 규칙 한 줄: **"느릴 수 있는 영역마다 `<Suspense>` 경계를 그어라 — 하나가 빠른 부분을 막지 않게."**
> 그리고 **각 섹션은 자기 데이터를 스스로 `await`하는 async 컴포넌트**로 만들어야 독립 스트리밍이 된다.

| 도구 | 격리하는 것 |
| --- | --- |
| `Suspense` | 로딩 (느린 영역) |
| `ErrorBoundary` | 에러 (실패한 영역) |

---

## 5. 오늘 실험 (2가지)

1. **독립 vs 묶음 비교**
   [(public)/page.tsx](<../apps/page0127/app/(public)/page.tsx>)의 두 `<Suspense>`를 하나로 합쳐 두 랭킹을 같이 감싸본다
   → 둘 중 **느린 쪽이 끝날 때까지 둘 다 안 보이는지** 확인 (독립 경계의 이점 체감).

2. **인위적 지연으로 스트리밍 관찰**
   [BookRankingSection](../apps/page0127/src/widgets/book/ui/BookRankingSection.tsx)의 `await` 앞에
   `await new Promise(r => setTimeout(r, 2000))`을 한쪽 type에만 추가
   → 한 랭킹만 2초 늦게, 다른 랭킹은 즉시 도착하는지 관찰. (실험 후 제거)

---

## 6. page0127 전수 검사 + 리팩토링 (waterfall 제거)

> 요청으로 Server Component 페이지 전체 전수 조사(서브에이전트) → 의존성 직접 검증 → 리팩토링.

오늘 주제는 "독립 Suspense 경계"지만, page0127의 페이지들은 통계·책목록이 **단일 Client 컴포넌트
(`DashboardContent`/`PublicLibraryContent`)로 상태(필터)를 공유**한다 → Suspense로 쪼개기 부적합.
대신 직렬 `await`(waterfall)를 **`Promise.all` 병렬화**로 개선했다.

### ✅ 적용 완료 (lint·tsc 통과)

| 파일 | 변경 | 직렬 유지(의존성) |
| --- | --- | --- |
| [dashboard/page.tsx](<../apps/page0127/app/(protected)/dashboard/page.tsx>) | profile·overallStats·stats·allBooks **4개 병렬** | `getAvailableYears`→`selectedYear` |
| [[username]/page.tsx](<../apps/page0127/app/(public)/[username]/page.tsx>) | (profile+user) → (allBooks+stats) **2단계 병렬** | `profile.id` 의존 |
| [books/all/page.tsx](<../apps/page0127/app/(protected)/books/all/page.tsx>) | global_books·myBooks·myLikes **3개 병렬** | 없음 |
| [books/info/[id]/page.tsx](<../apps/page0127/app/(protected)/books/info/[id]/page.tsx>) | stats+getUser 병렬 후 count | `book.isbn` 의존 |

### 핵심 구분 — "느린 영역"을 푸는 도구는 3가지

| 상황 | 도구 |
| --- | --- |
| 독립 섹션 + 독립 데이터 | **`<Suspense>` 경계 분리** (사례 A: 공개 홈 랭킹) |
| 통합 UI + 독립 데이터 | **`Promise.all` 병렬화** (이번 4곳) |
| 앞 결과를 뒤가 사용 | **직렬 유지** (병렬 불가 — taste-analysis 등) |

> 💡 교훈: 느린 페칭을 푸는 도구가 Suspense만은 아니다. **UI가 한 덩어리(상태 공유)면
> Suspense로 못 쪼개므로, `Promise.all`로 waterfall만 제거**하는 게 맞다.
> (의존성이 있는 `await`까지 무리하게 병렬화하면 버그 — 그래서 직접 검증이 필수)

---

## 7. 다음 Day 예고

**Day 62 — Error Boundary 심화**: 오늘의 "일부 실패해도 나머지"에서 **실패(에러) 쪽**을 깊게 판다.
중첩 Error Boundary + reset 버튼으로 API별 에러를 각각 복구하는 UX.
