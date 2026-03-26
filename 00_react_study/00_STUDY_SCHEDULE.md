# React page0127 독서 기록 앱으로 배우는 스터디 스케줄

## 개요

- **프로젝트**: page0127 독서 기록 앱 (기존 코드베이스 활용)
- **스택**: React 19 / Next.js App Router / TypeScript / TanStack Query v5 / Supabase / shadcn/ui
- **일일 학습**: 30분 (기존 코드 읽기 10분 + 실험·개선 15분 + 정리 5분)
- **기간**: 약 14주 (2026-03-19 ~ 2026-06-20)
- **주 5일 기준** (유연하게 조정 가능)

---

## 학습 전략

```
기존 코드 읽기 → 개념 파악 → 실험/개선 → 커밋
```

새 앱을 만드는 대신, page0127의 실제 코드(BookCard, BookShelf, 알림, 통계 등)를
직접 읽고 개선하며 개념을 체득합니다.

---

## 앱 진화 로드맵

```
Week 1-2  → 기존 코드 읽으며 React 기본 흐름 파악
Week 3-5  → 훅 심화 (책장 필터, 검색 debounce, useReducer 리팩토링)
Week 6-7  → 컴포넌트 패턴 (Portal, Error Boundary, Compound Component)
Week 8-9  → Next.js SC/CC 최적화 + TanStack Query 심화
Week 10-11 → React 19 기능 실제 적용 (useOptimistic, useActionState)
Week 12-14 → 성능 최적화 + React Compiler
```

---

## Phase 1 — React 기본 개념 (Week 1–2)

> 목표: 기존 코드에서 React 기본 개념이 어디에 적용되는지 눈으로 확인한다

| Day | 날짜     | 주제                     | 30분 할 일                                           | page0127 연결 포인트                             |
| --- | -------- | ------------------------ | ---------------------------------------------------- | ------------------------------------------------ |
| 1   | 03/19 ✅ | 단방향 데이터 흐름       | `features/book/` 컴포넌트에서 props 흐름 추적 + 실습 | BookCard ← BookList ← BookShelf 흐름 + 콜백 패턴 |
| 2   | 03/20 ✅ | 상태 끌어올리기          | 책장 탭 선택 상태가 어디에 있는지 파악               | 탭 상태를 올려야 하는 상황 직접 찾기             |
| 3   | 03/23 ✅ | 파생 상태 vs 독립 상태   | `filteredBooks`를 state vs 계산값으로 비교           | TanStack Query 캐시 데이터에서 파생 상태 확인    |
| 4   | 03/23 ✅ | 파생 상태 실습           | 장르/읽기상태별 필터 계산 로직 인라인 계산으로 작성  | `entities/book/` model 레이어 활용               |
| 5   | 03/23 ✅ | 컴포넌트 분리 기준       | `widgets/book/` 하위 컴포넌트 분리 기준 분석         | 재사용 vs 한번만 쓰이는 컴포넌트 구분            |
| 6   | 03/24 ✅ | Key — 리스트 그 이상     | BookList의 `key` prop 점검, index 사용 여부 확인     | Supabase id를 key로 쓰는 이유 이해               |
| 7   | 03/25 ✅ | 렌더링이 언제 일어나는가 | React DevTools로 BookCard 렌더링 추적                | 알림 드롭다운 열릴 때 불필요한 렌더 파악         |
| 8   | 03/25 ✅ | 렌더링 심화              | props/state 변경 시 렌더링 범위 실험                 | Header 리렌더링이 BookList에 영향 주는지 확인    |
| 9   | 03/25 ✅ | Strict Mode              | `layout.tsx`에서 StrictMode 확인, 이중 실행 확인     | Supabase 구독이 두 번 등록되는 문제 발견         |

---

## Phase 2 — 훅 제대로 이해하기 (Week 3–5)

> 목표: 기존 훅 코드를 읽고 → 더 나은 패턴으로 개선한다

| Day | 날짜     | 주제                                | 30분 할 일                                       | page0127 연결 포인트                                  |
| --- | -------- | ----------------------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| 10  | 03/26 ✅ | useState — 함수형 업데이트          | 책장 탭 토글 상태를 `prev =>` 패턴으로 개선      | 여러 필터가 동시 업데이트될 때 stale state 문제       |
| 11  | 03/26 ✅ | useState — lazy initialization      | 마지막 선택 탭을 localStorage에서 복원           | `useState(() => localStorage.getItem('tab'))`         |
| 12  | 03/26 ✅ | useState — 불변성                   | 독서 상태 배열 업데이트 시 불변성 점검           | 직접 push vs spread 차이 실험                         |
| 13  | 03/27    | useEffect — 기본 패턴               | 탭 변경 시 localStorage 저장 effect 작성         | `useEffect(() => save, [activeTab])`                  |
| 14  | 03/30    | useEffect — 남용 패턴               | 필터 계산을 effect에서 하는 안티패턴 찾아 제거   | TanStack Query 데이터를 effect로 동기화하는 패턴 확인 |
| 15  | 03/30    | useEffect — 의존성 배열             | `exhaustive-deps` ESLint 경고 전부 수정          | `features/notification/` hook 의존성 누락 확인        |
| 16  | 03/31    | useEffect — 클린업                  | 책 검색 debounce 타이머 클린업 구현              | `features/book/` 검색창에 debounce 적용               |
| 17  | 03/31    | useRef — 렌더링과 무관한 값         | 이전 탭 값을 ref에 저장 (리렌더 없이)            | 탭 전환 애니메이션 방향 결정에 활용                   |
| 18  | 04/01    | useRef — forwardRef                 | 책 검색 input에 외부에서 focus 제어              | `forwardRef`로 SearchInput 감싸기                     |
| 19  | 04/01    | useImperativeHandle ✨              | 검색창에 `.focus()`, `.clear()` 커스텀 명령 노출 | Header에서 단축키로 검색창 제어                       |
| 20  | 04/02    | useReducer — 교체 기준              | 복잡한 책장 필터 상태를 `useReducer`로 리팩토링  | `SET_TAB / SET_SORT / SET_GENRE / RESET` 액션         |
| 21  | 04/02    | useReducer 심화                     | 필터 초기화 버튼 + URL 쿼리 파라미터 동기화      | `useSearchParams`와 reducer 연동                      |
| 22  | 04/03    | useMemo / useCallback               | `filteredBooks` memoization, 핸들러 memoization  | Profiler로 개선 전/후 비교                            |
| 23  | 04/03    | useMemo/useCallback — 언제 필요한가 | React 19 Compiler 시대 필요/불필요 케이스 정리   | 과도한 memoization 제거                               |
| 24  | 04/21    | useDeferredValue                    | 책 목록 렌더링에 `useDeferredValue` 적용         | 검색 입력 타이핑이 막히지 않는 UX 확인                |
| 25  | 04/22    | useTransition                       | 탭 전환 시 `useTransition`으로 처리              | `isPending`으로 탭 전환 중 로딩 표시                  |
| 26  | 04/23    | useId                               | 필터 체크박스 `label-for` 접근성 개선            | `useId`로 고유 id 생성, shadcn/ui와 함께 사용         |
| 27  | 04/24    | useLayoutEffect                     | 알림 패널 열릴 때 스크롤 위치 조정               | `useLayoutEffect`로 DOM 측정 후 위치 계산             |

---

## Phase 3 — 컴포넌트 패턴 (Week 6–7)

> 목표: 기존 코드를 더 좋은 패턴으로 리팩토링한다

| Day | 날짜  | 주제                     | 30분 할 일                                        | page0127 연결 포인트                              |
| --- | ----- | ------------------------ | ------------------------------------------------- | ------------------------------------------------- |
| 28  | 04/25 | children / 컴포넌트 합성 | `BookCard`를 children 합성 방식으로 리팩토링      | `<BookCard><BookCard.Cover /><BookCard.Info />`   |
| 29  | 04/28 | 합성 실습                | `widgets/dashboard/` Layout을 children으로 감싸기 | 대시보드 레이아웃 재사용 구조 개선                |
| 30  | 04/29 | Portal ✨                | `createPortal`로 알림 드롭다운을 `body`에 렌더링  | z-index 충돌 문제 해결                            |
| 31  | 04/30 | Portal 심화 ✨           | 책 상세 모달을 Portal로 구현                      | 모달 + 스크롤 잠금 + ESC 닫기                     |
| 32  | 05/02 | Compound Component 패턴  | 책장 탭 시스템을 Compound Component로 설계        | `<BookShelf><BookShelf.Tab><BookShelf.Panel>`     |
| 33  | 05/07 | Compound Component 심화  | 내부 선택 상태를 Context로 공유                   | 외부에서 controlled/uncontrolled 모드 지원        |
| 34  | 05/08 | Context                  | AuthContext / ThemeContext 실제 구조 분석         | `shared/providers/` 레이어 이해                   |
| 35  | 05/09 | Context — 성능 고려      | Context 분리로 불필요한 리렌더링 방지             | `AuthContext` vs `UIContext` 분리 실험            |
| 36  | 05/12 | Custom Hook              | `useBookFilter`, `useBookSearch` 커스텀 훅 추출   | `features/book/` 로직을 컴포넌트에서 분리         |
| 37  | 05/13 | Custom Hook 심화         | `useLocalStorage`, `useDebounce` 추출             | `shared/` 레이어에 재사용 훅 구성                 |
| 38  | 05/14 | Error Boundary ✨        | Supabase API 실패 시 에러 UI 구현                 | `react-error-boundary` 적용, fallback UI 작성     |
| 39  | 05/15 | 상태 구조 설계           | 클라이언트 상태 flat vs nested 분석               | Zustand 도입 여부 결정 (vs TanStack Query로 통일) |
| 40  | 05/16 | Phase 3 복습             | FSD 레이어 다이어그램 그리기                      | entities → features → widgets 의존 방향 검증      |

---

## Phase 4 — Next.js 실무 + TanStack Query (Week 8–9)

> 목표: 이미 사용 중인 기술을 제대로 이해하고 최적화한다

| Day | 날짜  | 주제                           | 30분 할 일                                   | page0127 연결 포인트                            |
| --- | ----- | ------------------------------ | -------------------------------------------- | ----------------------------------------------- |
| 41  | 05/19 | App Router 라우트 구조 재파악  | `app/` 디렉토리 전체 흐름 도식화             | `(auth)` / `(public)` / `(protected)` 그룹 이해 |
| 42  | 05/20 | Server Component 최적화        | 현재 SC에서 데이터 패칭 로직 점검            | 불필요하게 `'use client'`인 컴포넌트 찾기       |
| 43  | 05/21 | Client Component 경계          | CC 범위 최소화 리팩토링                      | 인터랙션 없는 컴포넌트를 SC로 전환              |
| 44  | 05/22 | lazy + Suspense ✨             | 통계 차트(Recharts)를 `lazy`로 코드 스플리팅 | 초기 번들 크기 감소 확인                        |
| 45  | 05/23 | 데이터 패칭 패턴               | `fetch` + `cache`, `revalidate` 옵션 실습    | 책 목록 캐싱 전략 적용                          |
| 46  | 05/26 | loading.tsx / Suspense         | `loading.tsx`로 스켈레톤 UI 구현             | 책장 로딩 스켈레톤 카드                         |
| 47  | 05/27 | TanStack Query — queryKey 설계 | 현재 `useQuery` 패턴 전수 조사               | queryKey 네이밍 컨벤션 통일                     |
| 48  | 05/28 | TanStack Query — mutation      | `useMutation` + optimistic update 구현       | 좋아요 클릭 즉시 반영 (TanStack Query 방식)     |
| 49  | 05/29 | TanStack Query — 무한 스크롤   | `useInfiniteQuery`로 책 목록 페이지네이션    | 다음 페이지 자동 로드                           |
| 50  | 05/30 | Phase 4 복습                   | SC/CC 분리 + TanStack Query 설계 최종 점검   | 변경 내역 PR 설명처럼 정리                      |

---

## Phase 5 — React 19 핵심 (Week 10–11)

> 목표: React 19 환경이므로 신규 API를 실제 기능에 바로 적용한다

| Day | 날짜  | 주제                | 30분 할 일                                 | page0127 연결 포인트                   |
| --- | ----- | ------------------- | ------------------------------------------ | -------------------------------------- |
| 51  | 06/02 | useActionState 개요 | 독서 상태 변경 폼을 Server Action으로 처리 | `useActionState` 기본 패턴 이해        |
| 52  | 06/03 | useActionState 실습 | 에러/pending 상태 + 유효성 검사            | form action + 에러 메시지 표시         |
| 53  | 06/04 | useOptimistic       | 좋아요 버튼 낙관적 업데이트 구현           | 서버 응답 전 즉시 하트 UI 반영         |
| 54  | 06/05 | useOptimistic 심화  | 실패 시 롤백 처리                          | 네트워크 오류 → 원래 값 복원           |
| 55  | 06/09 | use()               | Supabase Promise를 `use()`로 처리          | Suspense와 함께 데이터 로딩 선언적으로 |
| 56  | 06/10 | Server Actions      | 팔로우/언팔로우를 Server Action으로 구현   | `'use server'` 함수 + `revalidatePath` |
| 57  | 06/11 | Phase 5 복습        | React 19 기능 적용 전/후 코드 diff 비교    | 어떤 코드가 얼마나 단순해졌는지 정리   |

---

## Phase 6 — 성능 / 동시성 (Week 12–14)

> 목표: 실제 앱의 병목을 찾아 수치로 개선한다

| Day | 날짜  | 주제                     | 30분 할 일                                 | page0127 연결 포인트                   |
| --- | ----- | ------------------------ | ------------------------------------------ | -------------------------------------- |
| 58  | 06/12 | useTransition 심화       | 대량 책 렌더링을 Transition으로 처리       | 완독 목록 전체 렌더링 부드럽게         |
| 59  | 06/13 | useTransition + Suspense | Transition 중 Suspense fallback 조합       | 탭 전환 중 이전 내용 유지 UX           |
| 60  | 06/16 | Suspense 중첩 패턴       | 책장 / 통계 / 알림 각각 독립 Suspense 경계 | 일부 실패해도 나머지 보여주는 구조     |
| 61  | 06/17 | Error Boundary 심화      | 중첩 Error Boundary + reset 버튼           | API별 에러 복구 UX                     |
| 62  | 06/18 | React.memo ✨            | `BookCard`에 `React.memo` 적용 + 비교 함수 | Profiler로 리렌더 횟수 비교            |
| 63  | 06/19 | React Compiler 이해      | Compiler가 자동 메모이제이션하는 범위 파악 | 기존 `useMemo`/`useCallback` 제거 실험 |
| 64  | 06/20 | React Compiler 실습      | `babel-plugin-react-compiler` 적용         | Compiler 적용 전/후 Profiler 수치 비교 |
| 65  | 06/23 | 번들 최적화              | `next/bundle-analyzer`로 번들 분석         | 불필요하게 큰 패키지 교체 or lazy 처리 |
| 66  | 06/24 | 최종 성능 점검           | React DevTools Profiler 전체 앱 분석       | 병목 지점 2개 이상 개선                |
| 67  | 06/25 | 전체 복습 & 회고         | Phase 1-6 개념 마인드맵 + 개선 내역 정리   | 학습 일지 완성                         |

---

## 추천 도구

| 도구                             | 용도                            |
| -------------------------------- | ------------------------------- |
| React DevTools (Profiler)        | 렌더링 추적, 성능 측정          |
| ESLint eslint-plugin-react-hooks | 훅 규칙 자동 검사 (이미 설정됨) |
| next/bundle-analyzer             | 번들 크기 분석                  |
| Supabase Dashboard               | DB/Auth 상태 확인               |
