# Day 24 — useDeferredValue

## 오늘 읽을 코드

- [UserSearch.tsx](../apps/page0127/src/features/user/ui/UserSearch.tsx) — 현재 버튼 클릭 방식 검색
- [search/page.tsx](../apps/page0127/app/(protected)/search/page.tsx) — 검색 페이지 진입점

---

## 핵심 개념

### useDeferredValue란?

입력값의 **지연된(deferred) 복사본**을 반환한다.  
React가 급하지 않은 렌더링(목록 필터링 등)을 **뒤로 미루게** 해서  
입력 타이핑이 막히지 않도록 한다.

```tsx
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query); // query보다 한 박자 늦게 업데이트

// query     → input에 즉시 반영 (타이핑 빠름)
// deferredQuery → 무거운 목록 필터링에 사용 (늦어도 됨)
```

### useTransition vs useDeferredValue

둘 다 **"무거운 렌더링을 뒤로 미뤄서 UX 개선"** 이 목적이다.  
"타이핑이 막힌다"는 그 효과가 눈에 띄는 예시일 뿐, 실제 개념은 더 넓다.

```
급한 렌더링    → input 타이핑, 버튼 클릭 피드백, 스크롤
급하지 않은 렌더링 → 검색 결과 목록, 차트 필터링, 통계 렌더링
```

React에게 "이 렌더링은 급하지 않아"라고 알려주는 것.  
차이는 **제어 지점**만 다르다.

| 구분 | 제어 지점 | 언제 쓰나? |
|---|---|---|
| `useTransition` | **setState 호출하는 쪽** | 내가 직접 dispatch/setState를 호출할 때 |
| `useDeferredValue` | **값을 받아 쓰는 쪽** | props나 외부 값을 늦추고 싶을 때 |

```tsx
// useTransition: 내가 dispatch를 직접 호출 → 감싸면 됨
const [isPending, startTransition] = useTransition();
startTransition(() => filterDispatch({ type: 'TOGGLE_MONTH', month }));

// useDeferredValue: props로 받은 값 → 직접 제어 불가 → 값만 늦춤
const deferredSearchQuery = useDeferredValue(searchQuery);
```

### isPending 대신 값 비교로 로딩 감지

```tsx
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery; // 아직 반영 안 된 상태

<div style={{ opacity: isStale ? 0.5 : 1 }}>
  {/* 목록 */}
</div>
```

---

## page0127 실제 코드 사례

현재 [UserSearch.tsx](../apps/page0127/src/features/user/ui/UserSearch.tsx)는 **버튼 클릭** 방식이다.

```tsx
// 현재: 버튼 클릭 → activeQuery 업데이트 → React Query 실행
const [searchQuery, setSearchQuery] = useState('');
const [activeQuery, setActiveQuery] = useState(''); // 검색 트리거용 분리 state

const { data: users = [], isLoading } = useQuery({
  queryKey: ['users', 'search', activeQuery],
  enabled: activeQuery.trim().length > 0, // activeQuery 있을 때만 실행
});
```

`useDeferredValue`는 **타이핑 즉시 필터링**하는 로컬 필터에 더 어울린다.  
(API 호출은 debounce가 더 적합 — 이유: defer는 렌더링을 늦추는 것이지, 네트워크 요청을 막지 않는다)

### 적합한 케이스: 로컬 데이터 필터링

```tsx
'use client';

import { useDeferredValue, useState, useMemo } from 'react';

type Props = {
  books: Book[]; // 이미 불러온 책 목록을 props로 받음
};

export const BookFilter = ({ books }: Props) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // deferredQuery 기준으로 필터링 → 타이핑이 느려지지 않음
  const filtered = useMemo(
    () =>
      books.filter((b) =>
        b.title.toLowerCase().includes(deferredQuery.toLowerCase())
      ),
    [books, deferredQuery]
  );

  const isStale = query !== deferredQuery;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        {filtered.map((b) => <BookCard key={b.id} {...b} />)}
      </div>
    </>
  );
};
```

---

## 정리 규칙 1줄

> **둘 다 "급하지 않은 렌더링을 뒤로 미루는 것". 차이는 제어 지점뿐 — setState 호출 쪽이냐, 값을 받는 쪽이냐.**

---

## 언제 체감하나?

지금 page0127은 책이 수십 권, 컴포넌트도 단순해서 차이가 없다.  
아래 조건이 겹칠수록 useTransition / useDeferredValue의 효과가 눈에 보인다.

- 목록 아이템이 수백 개 이상
- 필터 조건이 복잡해질수록 (카테고리 + 월 + 평점 + 검색어 복합)
- 아이템 하나가 무거운 컴포넌트일 때 (이미지, 차트 등)

**지금 쓰는 이유**: 나중에 느낄 때 "아 여기 쓰면 되겠다"를 바로 꺼낼 수 있도록.  
버벅임을 느끼는 순간 꺼내는 도구. 지금 당장 모든 곳에 쓸 필요는 없다.

### 사고 흐름

```
"클릭/타이핑했는데 화면이 버벅인다"
         ↓
"어떤 렌더링이 무거운가?"
         ↓
"이 렌더링이 지금 당장 필요한가?"
  급하다  → 그냥 둔다
  안급하다 → 뒤로 미룬다
         ↓
"내가 setState를 직접 호출하는가?"
  YES → useTransition
  NO  → useDeferredValue
```

### 직접 체감하는 방법 (실험용)

```tsx
// useMemo 안에 임시로 추가 → 인위적으로 300ms 블로킹
const filteredBooks = useMemo(() => {
  const start = performance.now();
  while (performance.now() - start < 300) {} // 지우는 거 잊지 말 것

  return books.filter(...).sort(...);
}, [...]);
```

추가 후 타이핑하면 멈추는 걸 느낄 수 있고,  
`useDeferredValue` 적용하면 타이핑은 매끄러워지는 차이가 바로 보인다.

---

## 오늘 실험

### 실험 1 — 지연 확인하기

`books/all/page.tsx`에서 책 목록을 Client Component로 바꿔  
input + useDeferredValue로 제목 필터링 추가해보기.

1. `page.tsx`에서 책 데이터를 fetch 후 Client Component로 넘긴다
2. Client Component 안에서 `useState` + `useDeferredValue` + `useMemo` 조합 작성
3. 타이핑 중 목록이 흐려지는지(`isStale`) 확인

### 실험 2 — API 요청과의 차이 직접 느끼기

`UserSearch.tsx`를 버튼 없이 **타이핑 즉시 API 호출**로 바꾸고,  
`useDeferredValue`와 debounce 각각을 적용해 차이를 비교해본다.

```tsx
// useDeferredValue 버전
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);

useQuery({
  queryKey: ['users', 'search', deferredQuery],
  queryFn: () => userApi.searchUsers(deferredQuery),
  enabled: deferredQuery.trim().length > 1,
});
// → 타이핑 중 deferredQuery가 늦게 반영되어 요청이 줄어드는 것처럼 보이지만
//   실제로는 렌더링 우선순위 문제이지 네트워크 throttle이 아님
```

---

## 다음 Day 예고

**Day 25 — useTransition**  
`startTransition`으로 상태 업데이트 우선순위 직접 제어하기.  
useDeferredValue와 같은 목표를 다른 방향에서 접근하는 쌍둥이 Hook.
