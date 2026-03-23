# Day 06 — Key: 리스트 그 이상의 의미

> Phase 1 | 2026-03-26
> 연결 코드: `widgets/book/ui/BookRankingList.tsx`, `widgets/dashboard/ReadingCalendar.tsx`

---

## 핵심 개념

> **key는 React가 "이 아이템이 저번과 같은 건지" 판단하는 유일한 수단이다.**

---

## key가 왜 필요한가

React는 리스트를 렌더링할 때 각 아이템을 추적해야 한다.
추가, 삭제, 순서 변경이 생겼을 때 **어떤 DOM을 재사용하고, 어떤 걸 새로 만들지** 알아야 하기 때문이다.

```
// 책 목록이 있다
[{ id: 'a', title: '책A' }, { id: 'b', title: '책B' }, { id: 'c', title: '책C' }]

// 중간에 '책B'를 삭제했다
[{ id: 'a', title: '책A' }, { id: 'c', title: '책C' }]
```

key가 있으면 React는 "id: b가 없어졌고, a와 c는 그대로다"라고 판단 → 최소한의 DOM 변경
key가 없으면 React는 순서로 판단 → 2번째 아이템이 바뀌었다고 착각 → 불필요한 DOM 업데이트

---

## 실제 코드 — BookRankingList.tsx

```tsx
// ✅ isbn을 key로 사용
{books.map((item, index) => {
  return (
    <div key={item.isbn} className="flex flex-col gap-2">
      <BookListItem book={book} rank={index + 1} ... />
    </div>
  );
})}
```

`isbn`은 책마다 고유한 값이다. 순위가 바뀌어도, 책이 추가/삭제돼도 React가 정확히 추적한다.

---

## index를 key로 쓰면 안 되는 경우

```tsx
// ❌ 순서가 바뀌거나 항목이 추가/삭제되는 목록에서 index 사용
{books.map((book, index) => (
  <BookCard key={index} book={book} />
))}
```

**버그가 생기는 상황:**

```
처음: [책A(0), 책B(1), 책C(2)]
책A 삭제 후: [책B(0), 책C(1)]

React 입장: "0번 아이템이 바뀌었고, 2번이 사라졌네"
실제:       "책A가 사라진 것" → 잘못된 추적
```

`BookCard` 안에 입력창이나 애니메이션 상태가 있다면 **엉뚱한 아이템에 상태가 붙는 버그**가 생긴다.

---

## index를 써도 되는 경우

```tsx
// ✅ 이 경우는 index 사용 가능
// - 목록이 절대 바뀌지 않는 정적 데이터
// - 필터/정렬/추가/삭제가 없는 경우
{FIXED_TABS.map((tab, index) => (
  <Tab key={index} label={tab} />
))}
```

실제로 프로젝트에서도 `key={i}` (태그 목록), `key={idx}` (분석 결과)처럼 index를 쓰는 곳이 있다.
해당 목록들은 **순서가 바뀌거나 항목이 추가/삭제되지 않는** 정적 데이터라서 괜찮다.

단, 태그처럼 사용자가 직접 입력하는 값은 중복이 생길 수 있어서 index + 값 조합이 더 안전하다.

```tsx
// 중복 가능성 있는 경우 — index + 값 조합
{myBook.tags.map((tag, i) => (
  <span key={`${i}-${tag}`}>#{tag}</span>
))}
// key 예시: "0-소설", "1-추천", "2-소설" → 중복 없음
// 참고: 한글도 key로 완전히 사용 가능. React는 언어를 구분하지 않는다.
```

---

## key의 숨겨진 기능 — 컴포넌트 리셋

key는 리스트 외에도 쓸 수 있다. **key가 바뀌면 React는 그 컴포넌트를 완전히 새로 만든다.**

```tsx
// ReadingCalendar.tsx
<Card key={`calendar-${currentYear}-${currentMonth}`}>
  ...
</Card>
```

월이 바뀔 때마다 `key`가 바뀌면서 Card 컴포넌트가 **언마운트 → 재마운트**된다.
캘린더 내부의 상태(선택된 날짜 등)를 자동으로 초기화하는 효과가 있다.

```
// useEffect나 setState 없이 상태 초기화
currentMonth = 3 → key="calendar-2026-3" → 이 Card 인스턴스
currentMonth = 4 → key="calendar-2026-4" → 완전히 새 Card 인스턴스
```

---

## 정리

| 상황 | 추천 key |
|------|---------|
| DB에서 온 데이터 | `key={item.id}` |
| 고유값이 보장되는 값 (isbn 등) | `key={item.isbn}` |
| 중복 가능성 있는 값 (사용자 입력 태그 등) | `` key={`${i}-${tag}`} `` |
| 완전히 정적인 목록 (절대 안 바뀜) | `key={i}` |

```
key 사용 기준
├── 리스트에서는 반드시 사용
├── 고유하고 안정적인 값 사용 (DB id, isbn 등)
├── index는 정적 목록에서만 허용
└── key 변경 = 컴포넌트 완전 초기화 (의도적으로 활용 가능)
```

---

## 오늘의 핵심

> **key는 "이 아이템이 이전과 같은 건가"를 판단하는 신분증이다.**
> key가 바뀌면 React는 새 컴포넌트라고 판단해 상태를 초기화한다.
