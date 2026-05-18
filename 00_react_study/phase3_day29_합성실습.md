# Day 29 — 합성 실습: Dashboard Layout을 children으로 감싸기

> 오늘 읽을 코드:
> - [widgets/dashboard/DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx)
> - [app/(protected)/dashboard/page.tsx](../apps/page0127/app/(protected)/dashboard/page.tsx)

---

## 1. 현재 구조 파악

`DashboardContent`는 레이아웃 + 데이터 + 상태 + 핸들러를 **한 컴포넌트에 전부** 넣은 구조다.

```
DashboardContent (600줄, 'use client')
  ├── header (연도 셀렉트, AI 분석 버튼)
  ├── StatCard ×4
  ├── YearlyTrendChart
  ├── DashboardCharts
  ├── ReadingJourneyCard
  ├── ReadingGoalProgress
  ├── ReadingCalendar
  └── DashboardBookList
```

props가 12개, useReducer 2개, useQuery 1개, useState 2개 — 한 컴포넌트가 너무 많은 책임을 진다.

---

## 2. 합성 패턴으로 개선하기

### 핵심 아이디어

**레이아웃 껍데기**와 **내용물(children)**을 분리한다.

```tsx
// Before: DashboardContent가 레이아웃까지 직접 그림
<div className='min-h-screen p-6 md:p-10'>
  <div className='mx-auto max-w-7xl space-y-8'>
    <header>...</header>
    <div className='grid grid-cols-2'>...</div>
  </div>
</div>

// After: Layout이 껍데기, 내용은 children으로
<DashboardLayout header={<DashboardHeader ... />}>
  <DashboardStats ... />
  <DashboardMainGrid ... />
</DashboardLayout>
```

### DashboardLayout 분리 예시

```tsx
// widgets/dashboard/DashboardLayout.tsx
type DashboardLayoutProps = {
  header: React.ReactNode;  // header 영역만 slot으로
  children: React.ReactNode;
};

export const DashboardLayout = ({ header, children }: DashboardLayoutProps) => {
  return (
    <div className='min-h-screen p-6 md:p-10'>
      <div className='mx-auto max-w-7xl space-y-8'>
        {header}
        {children}
      </div>
    </div>
  );
};
```

이렇게 하면 `/dashboard/settings` 같은 다른 페이지도 같은 레이아웃을 쓸 수 있다.

---

## 3. page0127 실제 코드 사례

### Server → Client 데이터 흐름

현재 `dashboard/page.tsx`(Server)가 데이터를 fetching하고, `DashboardContent`(Client)로 12개 props를 내려보낸다.

```tsx
// app/(protected)/dashboard/page.tsx (Server Component)
return (
  <DashboardContent
    overallStats={overallStats}
    stats={stats}
    books={books.filter((b) => b.status === 'completed')}
    // ... 9개 더
  />
);
```

합성 패턴 적용 후: **레이아웃 컴포넌트는 데이터 props 0개**, 데이터는 각 슬롯(children)이 직접 받는다.

### 현재 코드에서 children 패턴이 이미 쓰이는 곳

```tsx
// DashboardContent.tsx:596 — renderBooks prop이 사실상 children 패턴
<DashboardBookList
  ...
  renderBooks={(filteredBooks) => (
    <PublicBookShelf books={filteredBooks} />  // ← render prop = children의 변형
  )}
/>
```

`renderBooks`가 함수형 children이다. Day 28에서 배운 컴포넌트 합성의 실제 사용 예시.

---

## 4. 합성 패턴 결정 기준 (1줄 규칙)

| 상황 | 패턴 |
|------|------|
| 레이아웃만 재사용, 내용은 다름 | `children` |
| 여러 영역(header/sidebar/footer) | named slot (`header`, `footer` props) |
| 필터링된 데이터를 자식이 렌더 | render prop (`renderBooks={(items) => ...}`) |
| 단순 데이터 표시, 재사용 없음 | 그냥 props |

> **규칙**: 컴포넌트가 "어떻게 렌더할지"를 모르는 부분이 있으면 → children으로 위임

---

## 5. 오늘 실험

### 실험 1 — DashboardLayout 추출

`DashboardContent`에서 레이아웃 껍데기만 분리해서 `DashboardLayout.tsx` 파일을 만들어본다.

```tsx
// 실험: widgets/dashboard/DashboardLayout.tsx
type DashboardLayoutProps = {
  children: React.ReactNode;
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className='min-h-screen p-6 md:p-10'>
      <div className='mx-auto max-w-7xl space-y-8'>
        {children}
      </div>
    </div>
  );
};
```

`DashboardContent`에서 `<DashboardLayout>...</DashboardLayout>`으로 감싸고 기존 div 제거.

### 실험 2 — named slot으로 header 분리

```tsx
// header를 slot으로 받는 버전으로 변경
type DashboardLayoutProps = {
  header: React.ReactNode;
  children: React.ReactNode;
};

// page.tsx에서 사용할 때:
<DashboardLayout header={<DashboardHeader year={selectedYear} ... />}>
  <DashboardStats stats={stats} />
  ...
</DashboardLayout>
```

header를 분리하면 `DashboardHeader`는 독립 컴포넌트가 되어 Storybook 작성이 쉬워진다.

---

## 6. 다음 Day 예고

**Day 30 — Context API 기초**  
`DashboardContent`의 `filterState`와 `filterDispatch`를 12개 props 드릴링 없이 하위 컴포넌트에 전달하는 방법: `createContext` + `useContext`.
