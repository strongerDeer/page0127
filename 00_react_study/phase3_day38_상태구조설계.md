# Day 38 — 상태 구조 설계 (flat vs nested, Zustand 도입 여부)

> Phase 3 첫 회고. 지금까지 쌓인 클라이언트 상태들을 한 발 떨어져서 보고, **무엇을 어디에 둘 것인가**를 정리한다.

---

## 1. 오늘 읽을 코드

- [DashboardContent.tsx](apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — `useReducer` 2개 + `useState` 3개의 혼합 구조
- [ProfileSettingsForm.tsx](apps/page0127/src/features/profile/ui/ProfileSettingsForm.tsx#L89-L106) — `useState` 6개의 flat 구조
- [package.json](apps/page0127/package.json) — 현재 서버 상태는 `@tanstack/react-query`만 사용 (Zustand 없음)

---

## 2. 핵심 개념

### 2-1. 상태의 4가지 종류

| 종류              | 예시                                | 도구                                       |
| ----------------- | ----------------------------------- | ------------------------------------------ |
| **서버 상태**     | API 응답, DB 데이터                 | TanStack Query / SWR                       |
| **URL 상태**      | 필터, 정렬, 페이지 번호 (공유 가능) | `useSearchParams` / Next.js `searchParams` |
| **글로벌 UI**     | 테마, 사이드바, 모달, 토스트        | Zustand / Context                          |
| **로컬 컴포넌트** | 입력값, 포커스, 임시 토글           | `useState` / `useReducer`                  |

> 새 상태가 생기면 **위에서 아래로** 질문한다. 서버에 있나? → URL에 둘 수 있나? → 여러 화면에서 쓰나? → 아니면 로컬.

### 2-2. flat vs nested

> 📌 **단어 정리**
> **nested** = 영어 [ˈnestɪd] "네스티드". `nest`(둥지) + `-ed` → **"둥지처럼 안에 넣은", "중첩된"**.
> 새 둥지 속에 또 다른 작은 둥지가 들어있는 모양을 떠올리면 된다.
> 반대말은 **flat**(평평한). 둘은 짝으로 자주 등장하니 같이 외워둘 것.

> ⚠️ **헷갈리기 쉬운 포인트: nested = reducer가 아니다.**
> nested는 "상태 **모양**"의 얘기, reducer는 "상태 **갱신 방법**"의 얘기. 둘은 자주 같이 쓰일 뿐 다른 개념.

```ts
// flat — 변수가 여러 개 (모양만 본다)
const [nickname, setNickname] = useState('');
const [bio, setBio] = useState('');

// nested — 객체 하나에 묶음 (useState로도 가능!)
const [form, setForm] = useState({ nickname: '', bio: '' });
// 갱신: setForm({ ...form, nickname: '새이름' })

// nested + reducer — 묶고 + 액션으로 갱신 (묶음이 커지면 자주 같이 씀)
const [form, dispatch] = useReducer(formReducer, { nickname: '', bio: '' });
// 갱신: dispatch({ type: 'SET_NICKNAME', value: '새이름' })
```

| 개념       | 의미                 | 도구 예시                       |
| ---------- | -------------------- | ------------------------------- |
| **flat**   | 변수 여러 개로 분산  | `useState` × N                  |
| **nested** | 객체로 묶음 (모양)   | `useState({...})`, `useReducer` |
| reducer    | 액션으로 갱신 (방식) | `useReducer`                    |

→ 묶음이 단순하면 `useState({...})`, 액션이 많거나 복잡하면 `useReducer`.

---

#### "같이 죽고 같이 산다"는 게 뭔데?

상태들이 **운명 공동체**인지를 묻는 거다. 세 가지 신호로 판단한다.

**신호 ① — 함께 초기화되나? (같이 죽음)**

```ts
// DashboardContent의 필터 5개
// "전체 초기화" 버튼 누르면 → 5개가 동시에 리셋됨
filterDispatch({ type: 'RESET_ALL' });
// → selectedMonth, selectedCategory, selectedRating, searchQuery, statusFilter 전부 리셋
```

리셋 버튼이 하나라면 → **같이 죽는 사이** → 묶는 게 유리.

**신호 ② — 함께 갱신되나? (같이 삶, 원자적 갱신)**

```ts
// 캘린더의 year + month
// 1월에서 "이전 달" 누르면 → month=12, year=year-1 둘 다 바뀌어야 함
calendarDispatch({ type: 'PREV_MONTH' });

// useState 2개로 짰다면:
//   setMonth(12) → 렌더 → year는 아직 그대로 → "1월의 12월"이라는 잘못된 중간 상태가 노출됨
//   setYear(y-1) → 렌더
```

한 사건에 둘이 같이 바뀌어야 한다면 → **같이 사는 사이** → 묶어야 안전.

**신호 ③ — 동일 시점에 함께 의미를 갖나?**

```ts
// 모달 상태 — 모달이 닫히면 selectedItemId, mode는 더 이상 의미 없음
{ isOpen: false, selectedItemId: null, mode: 'view' }
```

`isOpen: false`인데 `selectedItemId`만 살아있는 건 의미 없음 → **같이 사는 사이**.

**반대 — 같이 안 죽고 안 사는 경우**

```ts
// 프로필 폼의 nickname, bio
// - nickname만 바꾸고 저장해도 됨
// - "전체 리셋" 버튼 없음
// - 변경 시점이 제각각
const [nickname, setNickname] = useState('');
const [bio, setBio] = useState('');
// → 묶을 이유가 없으니 flat이 정답
```

---

**판단 기준 한 줄**: **"같은 액션 하나로 같이 바뀌거나, 같은 버튼 하나로 같이 리셋되면"** → nested. 그게 아니면 flat이 더 깔끔.

### 2-3. Zustand가 필요한 순간

```ts
// 1) 서로 다른 라우트의 컴포넌트가 같은 상태를 본다
// 2) Provider로 감싸기 애매한 위치 (예: layout 외부, 모달 트리거)
// 3) Context가 너무 자주 리렌더를 유발한다 (selector로 구독 범위를 줄이고 싶다)

import { create } from 'zustand';
const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
}));
```

위 3개 중 **하나도 해당 안 되면** Zustand는 과잉이다. props/Context로 충분.

---

## 3. page0127 실제 코드 사례

### 3-1. DashboardContent — nested + flat 혼합

```tsx
// nested: 5개 필터를 하나의 객체로 묶어 reducer로 관리
type FilterState = {
  selectedMonth: number | null;
  selectedCategory: string | null;
  selectedRating: number | null;
  searchQuery: string;
  statusFilter: BookStatus | 'all';
};
const [filterState, filterDispatch] = useReducer(filterReducer, INITIAL_FILTER_STATE);
// → 'RESET_ALL' 액션 한 번으로 5개 동시 초기화

// nested: year + month는 원자적으로 갱신 (1월 → 12월 + year-1)
const [calendarState, calendarDispatch] = useReducer(calendarReducer, {
  calendarYear: initialCalendarYear,
  calendarMonth: initialCalendarMonth,
});

// flat: 단순 boolean 3개는 그대로 useState
const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
```

> 코드 주석에 이미 명시되어 있음 — *"단순 boolean은 useState가 적합 — useReducer는 복합 상태에 써야 의미 있음"* ([DashboardContent.tsx:256](apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L256))

### 3-2. ProfileSettingsForm — 전부 flat

```tsx
const [nickname, setNickname] = useState(profile.nickname || '');
const [bio, setBio] = useState(profile.bio || '');
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [currentPhotoUrl, setCurrentPhotoUrl] = useState(profile.photo_url);
const [isImageRemoved, setIsImageRemoved] = useState(false);
```

같은 폼인데 왜 reducer가 아닐까? → **함께 리셋되는 일이 없고, 각 필드 변경이 독립적**이기 때문이다. submit 시점에만 모아서 보낸다.

### 3-3. 서버 상태는 모두 TanStack Query

```tsx
const { data: calendarResult, isLoading } = useQuery({
  queryKey: ['calendar', calendarYear, calendarMonth],
  queryFn: async () => { ... },
  initialData: ...,
});
```

> 같은 파일 주석에 *"useEffect + fetch + useState 3개 → useQuery 1개로 교체"* ([DashboardContent.tsx:265](apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L265)) — 이미 이 프로젝트는 **서버 상태와 클라이언트 상태를 분리**하는 원칙을 따른다.

---

## 4. 지금 프로젝트는 적당히 쓰였나? — **잘 쓰였다**

각 상태마다 **"왜 이 도구인가"** 까지 따져보면:

| 상태                    | 현재 위치                       | flat/nested | 판정 | 이유                                                |
| ----------------------- | ------------------------------- | ----------- | ---- | --------------------------------------------------- |
| 책 목록, 통계, 캘린더   | TanStack Query                  | -           | ✅   | 서버에서 오는 데이터 → 서버 상태 도구가 정답        |
| 필터 5개 (월/카테고리)  | `useReducer`                    | **nested**  | ✅   | "전체 초기화"가 있음 → 같이 죽음                    |
| 캘린더 year+month       | `useReducer`                    | **nested**  | ✅   | 이전 달 액션 하나로 둘 다 바뀜 → 같이 삶 (원자적)   |
| 다이얼로그 boolean 3개  | `useState` × 3                  | **flat**    | ✅   | 각자 독립적으로 열림/닫힘 → 묶을 이유 없음          |
| 프로필 폼 6개           | `useState` × 6                  | **flat**    | ✅   | 각 필드 독립 변경, 리셋 없음 → 묶을 이유 없음       |
| 좋아요/팔로우           | TanStack Query mutation         | -           | ✅   | 서버 상태 + 낙관적 업데이트                         |
| 알림 드롭다운           | 내부 `useState`                 | **flat**    | ✅   | 컴포넌트 내부에서만 쓰임 → 로컬                     |
| 토스트                  | `sonner` 라이브러리             | -           | ✅   | 외부 라이브러리가 큐 관리                           |
| 글로벌 UI (사이드바 등) | 없음                            | -           | ✅   | 아직 필요한 케이스 자체가 없음 → Zustand도 불필요   |

**한 군데도 어색한 곳이 없다.** 오히려 모범 사례에 가까운 분배.

### Zustand 도입 결정 — **현재로선 No**

현재 컴포넌트들이 prop drilling을 겪고 있지 않고, "여러 라우트 공유 글로벌 UI 상태"가 사실상 없다. **Zustand는 필요해질 때 도입**.

도입 트리거가 될 만한 시그널 (앞으로 모니터링):

- 같은 모달/사이드바를 layout 외부에서 열어야 할 때
- 검색 히스토리/최근 본 책 등 **여러 화면이 공유하는 비-서버 상태**가 생길 때
- Context가 너무 광범위해서 selector 구독이 필요해질 때

### 앞으로 재검토할 시그널 (flat → nested 전환 후보)

- 프로필 폼에 **"입력 취소 → 모든 필드 원래 값으로 되돌리기"** 버튼이 생기면 → 6개가 "같이 죽는" 사이가 되므로 nested + reducer로 묶는 게 편해진다
- 다이얼로그 상호 배타 (한 모달이 열리면 다른 모달 자동 닫기) 같은 규칙이 생기면 → 3개 boolean을 `dialogState` 하나로 묶어 reducer 관리가 깔끔

---

## 5. 정리 — 상태 배치 결정 트리

```
새 상태가 필요하다
  ├─ 서버 데이터인가? ─── Yes → TanStack Query
  ├─ URL에 둬도 되나? ─── Yes → searchParams (공유/북마크 가능)
  ├─ 여러 라우트 공유? ─── Yes → Zustand
  ├─ 함께 갱신되는 필드 묶음? ─── Yes → useReducer
  └─ 그 외 ─── useState
```

**한 줄 규칙**: 서버 상태는 Query, **같이 죽고 같이 사는 상태는 nested(+필요하면 reducer)**, 나머지는 flat한 useState. Zustand는 prop drilling 통증이 생긴 뒤에 도입.

> 💡 외울 것: **nested 여부**(모양) ≠ **reducer 여부**(갱신 방법). 묶을지 말지 먼저 정하고, 묶었다면 액션이 많을 때만 reducer로.

---

## 6. 오늘 실험

### 실험 1 — DashboardContent의 boolean 3개를 reducer에 합쳐보기

`isGoalDialogOpen`, `isAnalyzing`, `isAnalyzeDialogOpen`을 하나의 `uiState`로 묶고 reducer로 관리해보자. 합친 뒤 **장단점을 직접 체감**하기.

- 합쳐서 좋은 점이 있는가? (예: 한 모달 열면 다른 모달 자동 닫기)
- 합쳐서 나빠진 점은? (보일러플레이트 증가, 단일 토글마저 액션 정의 필요)
- 원복할 가치가 있는지 판단

### 실험 2 — Zustand로 글로벌 토스트 큐 흉내내기 (실제 적용 X, 학습용)

`sonner` 대신 `useUIStore`에 `toasts: Toast[]`, `addToast()`, `removeToast()`를 만들어보자. 만든 뒤 **왜 굳이 라이브러리를 안 쓰고 Zustand로 짤 일이 거의 없는지** 체감.

---

## 7. 다음 Day 예고

**Day 39 — Phase 3 복습 (FSD 레이어 다이어그램)**: `entities → features → widgets → app` 의존 방향이 실제 page0127에서 깨진 곳이 없는지 검증. import 그래프로 시각화.
