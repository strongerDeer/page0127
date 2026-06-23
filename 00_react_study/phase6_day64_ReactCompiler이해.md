# Day 64 — React Compiler 이해 (자동 메모이제이션의 범위)

> Phase 6 · 성능 최적화 | 주제: Compiler가 자동 메모이제이션하는 범위 파악, 기존 `useMemo`/`useCallback` 제거 실험
> 선행: [Day 63 React.memo](./phase6_day63_ReactMemo.md) — 손으로 한 memo를 Compiler가 대체한다

---

## 1. 오늘 읽을 코드 (이미 다룬 수동 메모이제이션들)

- [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — `useMemo`로 `filteredBooks` 캐싱
- [BookGridItem.tsx](../apps/page0127/src/features/stats/ui/BookGridItem.tsx) — `React.memo` (Day 63에서 추가)
- [CommentSection.tsx](../apps/page0127/src/features/comment/ui/CommentSection.tsx) — `useMemo`를 **일부러 안 쓴** 판단 주석

---

## 2. 핵심 개념

### React Compiler란?

> **빌드 타임에** 컴포넌트·훅을 분석해서, 필요한 곳에 메모이제이션 코드를 **자동으로 끼워 넣는** 컴파일러.

지금까지 손으로 하던 것:

```tsx
// 수동: "이 값/함수/컴포넌트는 안 바뀌면 재사용해줘"를 개발자가 지시
const filtered = useMemo(() => books.filter(...), [books]);
const handle = useCallback(() => ..., []);
export const Item = memo(({ book }) => ...);
```

Compiler를 켜면 → 위 세 가지를 **개발자가 안 써도** 컴파일러가 알아서 한다.
즉 `useMemo`/`useCallback`/`React.memo`는 대부분 **삭제 가능**해진다.

### 무엇을 자동화하나 (범위)

| 수동 도구 | Compiler가 대체하는 것 |
| --- | --- |
| `useMemo` | 컴포넌트 안의 비싼 계산 결과 캐싱 |
| `useCallback` | 함수 참조 안정화 |
| `React.memo` | props 안 바뀐 자식 컴포넌트 리렌더 스킵 |

> Compiler는 **렌더링 단위(컴포넌트·훅)** 만 최적화한다. 컴포넌트 밖 일반 함수/모듈 로직은 대상이 아니다.

### 공짜가 아니다 — "Rules of React"를 지켜야 작동

Compiler는 코드가 **순수(pure)** 하고 **불변(immutable)** 이라고 믿고 최적화한다. 이 가정을 어기면:

- 해당 컴포넌트만 최적화를 **포기(bail out)** 하고 기존처럼 동작 → 앱은 안 깨지지만 그 컴포넌트는 최적화 안 됨

```tsx
// ❌ 렌더 중 props/state를 직접 변형 → Compiler가 bail out
function Bad({ items }) {
  items.push('x');        // 입력 변형 (불변성 위반)
  return <List items={items} />;
}
```

> 그래서 `eslint-plugin-react-compiler`가 위반을 **빌드 전에** 잡아준다. (Day 65에서 설치)

### 그래도 수동으로 남기는 경우

Compiler가 있어도 드물게 남긴다:

- `useMemo`의 결과를 **외부 라이브러리/effect deps에 "안정 참조"로 넘겨야** 하는 의미적 요구
  (성능이 아니라 "참조가 같아야 로직이 맞는" 경우) — 대부분 Compiler가 보장하지만, 경계 케이스는 주의
- Compiler가 bail out하는 컴포넌트의 핫패스

---

## 3. page0127 실제 사례 — Compiler 적용 시 어떻게 되나

### ① DashboardBookList의 `useMemo(filteredBooks)`

```tsx
// 현재: 손으로 deps 7개를 나열해서 캐싱
const filteredBooks = useMemo(
  () => books.filter(...).sort(...),
  [books, selectedMonth, selectedCategory, selectedRating,
   deferredSearchQuery, sortOption, statusFilter]  // ← 빠뜨리면 버그
);
```

→ **Compiler 적용 후**: `useMemo`와 deps 배열을 **통째로 제거** 가능.
Compiler가 의존성을 자동 추적해 같은 입력이면 캐시 반환. (deps 빠뜨리는 버그도 사라짐)

### ② BookGridItem의 `React.memo` (Day 63)

```tsx
export const BookGridItem = memo(({ book, href }) => ...);
BookGridItem.displayName = 'BookGridItem';
```

→ **Compiler 적용 후**: `memo()` 래퍼와 `displayName`을 벗기고
`export const BookGridItem = ({ book, href }) => ...` 로 되돌려도 동일하게 리렌더가 스킵된다.
> Day 63에서 "걷어낼 건 memo 한 겹뿐"이라 한 게 이것. **컴포넌트 추출(구조)은 그대로 자산**으로 남는다.

### ③ CommentSection — 이미 "비메모"를 선택한 코드

```tsx
// useMemo 불필요: comments가 바뀌면 어차피 다시 계산해야 하고,
// 댓글 수십 개를 더하는 연산은 매우 빠르다 → 캐싱 비용이 이득보다 크다
const totalCount = comments.reduce(...);
```

→ Compiler 적용 후: **"메모할까 말까"라는 고민 자체가 사라진다.**
Compiler가 비용/이득을 따져 알아서 처리하므로, 개발자는 로직에만 집중하면 된다.

---

## 4. 정리

| 항목 | Compiler 적용 후 |
| --- | --- |
| 성능 목적 `useMemo`/`useCallback` | 대부분 **제거 가능** |
| 성능 목적 `React.memo` | 제거 가능 (컴포넌트 추출 구조는 유지) |
| deps 배열 관리 | 불필요 (자동 추적) |
| "메모할까" 고민 | 불필요 |
| 작동 조건 | **Rules of React 준수**(순수·불변), 어기면 그 컴포넌트만 bail out |

> **규칙 1줄**: Compiler는 _"순수하게 짜면 메모이제이션을 공짜로 해주는"_ 도구다 — 수동 memo는 줄이되, 코드의 순수성·불변성은 더 엄격히 지켜야 한다.

---

## 5. 오늘 실험 (2가지)

### 실험 1 — React Compiler Playground로 변환 결과 보기 (설치 불필요)
1. <https://playground.react.dev> 접속
2. [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx)의 `filteredBooks` `useMemo` 블록만 작은 컴포넌트로 떼어 붙여넣기
3. 오른쪽 컴파일 결과에서 `_c(...)`(캐시 슬롯) 코드가 자동 생성되는지 확인
   → 내가 쓴 `useMemo` 없이도 캐싱 코드가 들어가는 걸 눈으로 본다

### 실험 2 — "이 메모는 제거 가능한가?" 판정 연습
[BookGridItem.tsx](../apps/page0127/src/features/stats/ui/BookGridItem.tsx)의 `memo`와
[DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx)의 `useMemo`를 보고 각각:
- 이 메모이제이션이 **순수 성능 목적**인가? → 그렇다면 Compiler 적용 후 제거 가능 ✅
- 결과 참조가 **effect deps나 외부 라이브러리에 "안정 참조"로 필요**한가? → 그렇다면 신중 ⚠️
- 결론을 1줄 메모로 남겨 Day 65 제거 실험의 체크리스트로 쓴다

> ⚠️ 이번 Day는 **이해만** — 실제 코드에서 `useMemo`를 지우지는 않는다. 제거는 Day 65에서 Compiler를 켠 뒤 한꺼번에.

---

## 6. 다음 Day 예고

**Day 65 — React Compiler 실습**: `babel-plugin-react-compiler`를 실제로 설치하고
[next.config.ts](../apps/page0127/next.config.ts)에 켠다. 그 후 오늘 체크리스트로 표시한
`useMemo`/`memo`를 제거하고 **Profiler 수치를 적용 전/후 비교**한다.
