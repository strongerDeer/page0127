# Day 13 — useEffect: 기본 패턴

> useEffect의 목적과 의존성 배열 동작을 page0127 실제 코드로 이해한다.

---

## 오늘 읽을 코드

- [BookSearchInput.tsx](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx) — debounce useEffect 실제 구현

---

## useEffect의 목적

useState가 "렌더링 간 값을 기억하는 것"이라면,
useEffect는 **값 변화가 원인인 외부 부수효과를 처리하는 것**이다.

```
외부 세계: localStorage, setTimeout, fetch, DOM 직접 조작, 구독(WebSocket) 등
```

**부수효과(side effect)란?**

```
주 목적(렌더링) 외에 외부 세계에 영향을 주는 것
→ 화면에 그리는 것 말고도 일어나는 일들
```

**언제 쓰나?**

> 어떤 **값(state/props)이 바뀐 결과**로, React 밖의 무언가를 업데이트해야 할 때

반대로 **사용자 행동(클릭, 키보드)이 직접 원인**이면 이벤트 핸들러를 쓴다.

---

## 기본 문법

```tsx
useEffect(() => {
  // 실행할 코드 (렌더링 후 실행됨)

  return () => {
    // 클린업 (다음 effect 실행 전, 또는 언마운트 시 실행)
  };
}, [의존성]);
```

---

## 의존성 배열 — 3가지 패턴

```tsx
// 1. 배열 없음 → 매 렌더링마다 실행 (거의 쓸 일 없음)
useEffect(() => {
  console.log('매번 실행');
});

// 2. 빈 배열 → 마운트(첫 렌더) 1회만 실행
useEffect(() => {
  console.log('처음 한 번만');
}, []);

// 3. 값 지정 → 해당 값이 바뀔 때마다 실행
useEffect(() => {
  console.log('inputValue가 바뀔 때마다');
}, [inputValue]);
```

---

## page0127 실제 코드 — BookSearchInput debounce

[BookSearchInput.tsx:37-44](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx#L37)

```tsx
useEffect(() => {
  // inputValue가 바뀌면 300ms 타이머 시작
  const timer = setTimeout(() => {
    onSearchChange(inputValue); // 300ms 후 부모에게 전달
  }, 300);

  // 클린업: 다음 effect 실행 전에 이전 타이머를 지운다
  return () => clearTimeout(timer);
}, [inputValue, onSearchChange]);
```

**동작 흐름:**

```
사용자 입력 → inputValue 변경 → 리렌더링
→ useEffect 실행: 이전 타이머 취소 + 새 타이머 시작
→ 300ms 동안 입력 없으면: onSearchChange 호출
→ 300ms 이내 또 입력하면: 이전 타이머 취소 → 타이머 리셋
```

이게 debounce다. "입력이 멈춘 뒤에만" 검색하게 해서 불필요한 API 호출을 방지한다.

---

## 이벤트 핸들러 vs useEffect — 언제 무엇을 쓰나

**원인이 무엇인가**로 구분한다.

| 원인 | 방법 |
|------|------|
| 사용자 행동 (클릭, 키보드) | **이벤트 핸들러** |
| 값 변화 → 외부 부수효과 | **useEffect** |

### 예시: localStorage 저장

```tsx
// ✅ 이벤트 핸들러 방식 (Day 11에서 적용한 방식)
// 원인이 명확한 경우 — "탭 클릭 시 저장"
const handleStatusChange = (status: BookStatus | 'all') => {
  setStatusFilter(status);
  localStorage.setItem('dashboard-status-filter', status); // 핸들러에서 직접 저장
};

// ✅ useEffect 방식
// state가 어떤 경로로 바뀌든 항상 동기화해야 할 때
useEffect(() => {
  localStorage.setItem('dashboard-status-filter', statusFilter);
}, [statusFilter]); // statusFilter가 바뀔 때마다 저장
```

**어떤 게 더 나은가?**

```
클릭이 원인  → 핸들러 (원인이 명확, 직접 반응)
값 변화가 원인 → useEffect (어떤 경로로 값이 바뀌든 항상 동기화)
```

`DashboardBookList`: 버튼 클릭이 원인 → 핸들러 방식이 적합
`BookSearchInput`: `inputValue`라는 값 변화가 원인, 타이밍 제어 필요 → useEffect가 적합

---

## 안티패턴: useEffect로 state를 동기화하려는 시도

```tsx
// ❌ useEffect 안에서 다른 state를 업데이트 — 거의 항상 잘못된 패턴
useEffect(() => {
  setFilteredBooks(books.filter(...)); // ← 이건 파생 상태, 그냥 계산하면 됨
}, [books, statusFilter]);

// ✅ 그냥 렌더 시 계산
const filteredBooks = books.filter(...);
```

> "state → 다른 state 동기화"가 필요하다면 먼저 파생 상태로 계산할 수 없는지 확인한다.
> (Day 14에서 자세히 다룸)

---

## 정리

| | useState | useEffect |
|--|--|--|
| 목적 | 값 기억 | 외부 세계 동기화 |
| 실행 시점 | setState 호출 시 | 렌더링 후 |
| 의존성 배열 | 없음 | 언제 실행할지 제어 |

**기억할 것**

> 원인이 **사용자 행동**이면 → 이벤트 핸들러
> 원인이 **값 변화**이고 **외부 세계에 영향**을 줘야 하면 → useEffect

---

## 오늘 실험

1. [BookSearchInput.tsx:37-44](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx#L37) 열기
2. 클린업 함수(`return () => clearTimeout(timer)`)를 제거하면 어떻게 될지 생각해보기
   - 빠르게 타이핑할 때 타이머가 쌓임 → 여러 번 검색 실행 → 불필요한 API 호출
3. 의존성 배열에서 `onSearchChange`를 빼면? → 부모가 새 함수를 넘겨도 반응 안 함

---

## 다음 Day 14

`useEffect` 남용 패턴 — effect로 state를 동기화하는 안티패턴 찾아 제거
