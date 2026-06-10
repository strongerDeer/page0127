# Day 54 — `use()` 훅: client에서 데이터를 기다리는 도구

> Phase 5 · React 19 신규 API
> 한 줄 요약: **`use()`는 `'use client'` 컴포넌트가 데이터를 기다릴 때 쓰는 `await`의 대체품**이다.

---

## 1. 오늘 읽을 코드

- [BookRankingSection.tsx](apps/page0127/src/widgets/book/ui/BookRankingSection.tsx) — async Server Component가 `await`로 직접 fetch
- [CalendarSection.tsx](apps/page0127/src/widgets/dashboard/CalendarSection.tsx) — 받은 데이터를 완성해 client에 prop으로 내림
- [DashboardContent.tsx](apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L99-L100) — client 컴포넌트는 "받은 데이터"를 쓰기만 함

> page0127은 `use()`를 **안 쓴다.** 오늘은 "왜 안 써도 되는지"와 "그럼 언제 쓰는지"를 잡는 게 목표다.

---

## 2. 핵심: `await`와 `use()`는 똑같이 "기다린다" — 장소만 다르다

둘 다 "데이터 올 때까지 기다려"라는 **같은 일**을 한다. 차이는 **쓸 수 있는 장소**뿐이다.

```tsx
// Server Component는 async를 붙일 수 있다 → await 사용
async function Page() {
  const data = await getData(); // ✅ 기다림
}
```

```tsx
'use client';
// Client Component는 async를 못 붙인다 (React 규칙)
async function Comp() {} // ❌ 이렇게 못 만든다
```

`'use client'` 컴포넌트는 `async`를 못 붙여서 **`await`로 기다릴 방법이 없다.**
바로 이때 대신 쓰는 게 `use()`다.

```tsx
'use client';
function Comp({ promise }) {
  const data = use(promise); // ✅ client에서 기다리는 유일한 방법
}
```

| 누가 기다리나? | 도구 |
|---|---|
| 서버 (async 함수) | `await` ← page0127 전부 이거 |
| 클라이언트 (`'use client'`, async 못 붙임) | `use()` |

---

## 3. 그럼 언제 쓰나 — "어쩔 수 없이 client인데, 데이터도 필요한" 컴포넌트

`'use client'`를 붙이는 이유는 보통 **상태(useState)나 클릭 이벤트** 때문이다.
그런 컴포넌트가 **추가로 비동기 데이터까지 필요**해지는 순간이 `use()`의 자리다.

### 예시 — "책 상세 모달"

책을 클릭하면 모달이 뜨고, 그 안에 그 책의 리뷰를 보여준다고 하자.

```tsx
'use client'; // ← 모달 열고 닫는 상태 때문에 client일 수밖에 없음

const BookModal = ({ reviewsPromise }) => {
  const [isOpen, setIsOpen] = useState(false); // 이것 때문에 client

  if (!isOpen) return <button onClick={() => setIsOpen(true)}>열기</button>;

  const reviews = use(reviewsPromise); // ← 모달이 열릴 때 리뷰를 기다림
  return <ReviewList items={reviews} />;
};
```

이 컴포넌트는 **모달 상태** 때문에 client여야 하고(서버 컴포넌트로 못 만듦),
**리뷰 데이터**도 기다려야 한다 → `await`를 못 쓰니 `use()`를 쓴다.

### 후보가 되는 컴포넌트들

| 컴포넌트 | client인 이유 | 기다리는 데이터 |
|---|---|---|
| 탭 컨테이너 | 탭 전환 상태 | 선택된 탭의 내용 |
| 모달/드로어 | 열기·닫기 상태 | 열렸을 때 보여줄 상세 |
| 검색·필터 UI | 입력값 상태 | 필터 결과 |

공통점: **상태로 인터랙션을 하느라 client인데, 그 안에서 데이터도 보여줘야 하는** 컴포넌트.

---

## 4. 솔직히 — 흔하지 않다

위 상황도 실무에선 보통 **다른 방법**으로 더 많이 한다:

- `react-query`의 `useQuery`
- `useEffect` + `useState`로 직접 fetch
- 아니면 **서버에서 다 받아서 prop으로 내려주기** (제일 흔함, page0127 방식)

`use()`는 React 19가 새로 미는 방식이지 **필수가 아니다.** `use()` 평생 안 쓰는 개발자도 많다.

---

## 5. page0127엔 왜 없나

page0127은 **항상 서버에서 미리 다 기다려서** 완성된 데이터를 client에 prop으로 내려준다.

```
[Server Component] await로 다 받음 → 완성품을 prop으로 →  [Client Component]
   (CalendarSection)                                       (CalendarBlock)
                                                       ↑ 기다릴 필요 없음. 받은 거 쓰기만 함
```

[CalendarSection.tsx](apps/page0127/src/widgets/dashboard/CalendarSection.tsx)이 `await`로 다 받아
`CalendarBlock`(client)에 `initialData`로 넘긴다. client는 **직접 기다릴 일이 없으니** `use()`도 필요 없다.

---

## 6. 규칙 한 줄

> 데이터를 받는 곳이 **서버면 `await`**, 데이터를 받는 곳이 **`'use client'` 컴포넌트면 `use()`**.
> 같은 "기다림"인데 장소만 다르다.

(보너스) `use()`는 `if`·early return 뒤·루프 안에서도 호출 가능한 **유일한 훅**이다 — 그래서 위 모달 예시처럼 `if (!isOpen) return ...` 뒤에서 호출해도 에러가 안 난다.

---

## 7. 오늘 실험 (2가지)

### 실험 1 — 머릿속 분류 연습 (코드 없이 OK)

아래 컴포넌트가 `await`감인지 `use()`감인지 한 줄로 분류해보기:

1. 책 목록을 보여주는 페이지 (상태 없음, 서버에서 fetch) → ?
2. 좋아요 버튼 (onClick 있음, 데이터는 prop으로 받음) → ?
3. 검색창: 입력할 때마다 결과를 가져와 보여줌 → ?

> 답: 1) `await` 2) 둘 다 아님(이미 받은 데이터를 쓰기만 함) 3) client라서 `use()` 후보

### 실험 2 — 조건부 호출 확인

```tsx
const Comp = ({ promise, enabled }) => {
  if (!enabled) return <p>비활성</p>;
  const value = use(promise); // ← early return 뒤에서 호출해도 에러 안 남?
  return <Data value={value} />;
};
```

- 같은 위치에 `useState`를 넣으면 "Rendered more hooks than..." 에러가 나는데, `use()`는 왜 괜찮은지 확인.
- 한 줄 메모: "use()가 다른 훅과 다른 점은 ___."

---

## 8. 다음 Day 예고

**Day 55 — Server Actions**: 팔로우/언팔로우를 `'use server'` 함수로 구현하고 `revalidatePath`로 캐시를 무효화한다. 오늘이 "데이터 **읽기**의 장소(서버 vs 클라이언트)"였다면, 다음은 "데이터 **바꾸기**(mutation)를 서버에서 처리하기"다.
