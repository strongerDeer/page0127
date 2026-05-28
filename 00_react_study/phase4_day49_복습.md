# Day 49 — Phase 4 복습 (SC/CC 분리 + TanStack Query 설계)

> Phase 4 마무리. Day 41~48에서 배운 걸 종합 점검하고, 변경 내역을 **PR 설명처럼** 정리하는 연습을 한다.

---

## 1. Phase 4 한눈에 보기

| Day | 주제 | 한 줄 핵심 |
| --- | --- | --- |
| 41 | Server Component 최적화 | 데이터 패칭은 기본 SC에서 |
| 42 | Client Component 경계 | 인터랙션 있는 곳만 `'use client'` |
| 43 | lazy + Suspense | 무거운 컴포넌트(차트)는 코드 스플리팅 |
| 44 | 데이터 패칭 패턴 | `fetch` + `cache` / `revalidate` |
| 45 | loading.tsx / Suspense | 로딩 중 스켈레톤 UI |
| 46 | TanStack Query — queryKey | 키 네이밍 컨벤션 통일 |
| 47 | TanStack Query — mutation | `useMutation` + 낙관적 업데이트 |
| 48 | TanStack Query — 무한 스크롤 | `useInfiniteQuery` + 페이지 누적 |

이 Phase의 두 축: **① SC/CC를 언제 나누나 / ② TanStack Query를 어떻게 설계하나.**

---

## 2. 축 ① — SC vs CC, 경계 긋는 법

### 판단 기준 (이것만 기억)

```
useState / useEffect / 이벤트 핸들러 / 브라우저 API 필요?
   └─ YES → Client Component ('use client')
   └─ NO  → Server Component (기본값)
```

### 핵심 규칙

- **기본은 SC.** `'use client'`는 "필요해서 켜는" 것이지 기본이 아니다.
- **CC는 잎(leaf)으로 밀어낸다.** 페이지 전체를 CC로 만들지 말고, 버튼·폼처럼 인터랙션하는 **작은 조각만** CC로.
- **데이터 패칭은 SC에서**, 그 결과를 CC에 props로 내려준다.

```tsx
// ✅ 좋은 경계: SC가 데이터 받고, 인터랙션 조각만 CC
// page.tsx (SC)
const ActivityPage = async () => {
  return (
    <section>
      <h1>활동 피드</h1>
      <ActivityFeed /> {/* 이 안에서 인터랙션 → CC */}
    </section>
  );
};
```

> Day 48의 [ActivityFeed.tsx](../apps/page0127/src/widgets/activity/ui/ActivityFeed.tsx)가 `'use client'`인 이유: `useInfiniteQuery` + `IntersectionObserver`(브라우저 API) + `useRef`/`useEffect`를 쓰니까. **인터랙션 덩어리라서 CC가 맞다.**

### lazy + Suspense (Day 43)

무거운 컴포넌트는 초기 번들에서 떼어낸다.

```tsx
const StatsChart = lazy(() => import('./StatsChart')); // Recharts 등 무거운 것

<Suspense fallback={<Skeleton />}>
  <StatsChart />
</Suspense>
```

---

## 3. 축 ② — TanStack Query 설계 점검

### queryKey 설계 (Day 46) — [queryKeys.ts](../apps/page0127/src/entities/activity/model/queryKeys.ts)

키를 **계층적 팩토리**로 관리하면 무효화(invalidate)가 쉬워진다.

```typescript
export const activityKeys = {
  all: ['activities'] as const,
  feeds: () => [...activityKeys.all, 'feed'] as const,
  feed: (filter?: FeedFilter) => [...activityKeys.feeds(), filter] as const,
  detail: (id: string) => [...activityKeys.details(), id] as const,
} as const;
```

> `all`을 무효화하면 하위 전부 갱신, `feeds()`만 무효화하면 피드만 갱신. **상위 키가 하위를 포함**하는 구조가 핵심.

### 3가지 훅, 언제 쓰나

| 훅 | 용도 | 핵심 옵션 |
| --- | --- | --- |
| `useQuery` | 단일 조회 | `queryKey`, `queryFn` |
| `useMutation` | 생성/수정/삭제 | `mutationFn`, `onMutate`(낙관적), `onError`(롤백) |
| `useInfiniteQuery` | 무한 스크롤 | `initialPageParam`, `getNextPageParam` |

### mutation 낙관적 업데이트 흐름 (Day 47)

```typescript
useMutation({
  mutationFn: toggleLike,
  onMutate: async () => {
    // 1) 진행 중 쿼리 취소 → 2) 이전 값 백업 → 3) UI 먼저 바꿈(낙관적)
  },
  onError: (err, vars, context) => {
    // 4) 실패 시 백업값으로 롤백
  },
  onSettled: () => {
    // 5) 성공/실패 무관 → 서버와 최종 동기화 (invalidate)
  },
});
```

> "좋아요"는 즉시 반영돼야 하므로 서버 응답을 기다리지 않고 **UI를 먼저 바꾸고**, 실패하면 되돌린다.

---

## 4. PR 설명처럼 정리하는 법 (오늘의 진짜 목표)

복습 = "내가 한 변경을 남이 이해하게 설명"하는 것. PR 본문 양식:

```markdown
## 변경 요약
TanStack Query 기반 데이터 패칭 일관성 정비 + SC/CC 경계 재조정

## 변경 내용
- queryKey를 팩토리 패턴으로 통일 (activityKeys 등)
- 좋아요/댓글 mutation에 낙관적 업데이트 적용
- 활동 피드를 useInfiniteQuery + IntersectionObserver로 무한 스크롤화
- 인터랙션 없는 컴포넌트를 SC로 전환, 번들 크기 감소

## 왜
- 캐시 무효화 범위를 예측 가능하게
- 사용자 체감 반응속도 개선 (낙관적 업데이트)

## 확인 방법
- React Query DevTools에서 queryKey 계층 확인
- 좋아요 클릭 시 즉시 반영 / 네트워크 실패 시 롤백 확인
```

> **좋은 PR 설명 = 무엇을(What) + 왜(Why) + 어떻게 확인(How to verify).** 커밋 메시지 컨벤션의 "무엇을·왜"와 같은 원리.

---

## 5. 정리 — Phase 4 자가 점검 체크리스트

- [ ] 새 컴포넌트 만들 때 "이거 CC여야 하나?"를 먼저 묻는다
- [ ] `'use client'`는 인터랙션 잎 컴포넌트에만 붙인다
- [ ] queryKey는 팩토리로 계층 관리 (`all → feeds → feed`)
- [ ] 즉시 반영이 중요한 액션은 mutation 낙관적 업데이트
- [ ] 목록은 `useInfiniteQuery`, `data.pages`는 `.flat()`으로 펴서 렌더

**한 줄 규칙:** SC가 기본, CC는 잎으로. queryKey는 계층 팩토리로, 무효화는 상위 키 하나로.

---

## 6. 오늘 실험 (2가지)

1. **CC 후보 찾기**
   page0127에서 `'use client'`가 붙은 컴포넌트를 grep으로 모두 찾아보고, 그중 "사실 인터랙션이 없는데 CC인" 게 있는지 점검한다.
   ```
   grep -rln "'use client'" apps/page0127/src
   ```

2. **나의 Phase 4 PR 설명 작성해보기**
   위 4번 양식에 맞춰, 내가 이번 Phase에서 실제로 바꾼 내용을 PR 본문으로 직접 써본다. (What/Why/How to verify 3단 구성)

---

## 7. 다음 Day 예고

**Phase 5 — React 19 핵심** 시작: `use`, `useActionState`, `useOptimistic` 등 React 19 신규 API를 실제 기능에 바로 적용한다.
