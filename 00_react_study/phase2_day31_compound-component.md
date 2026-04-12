# Day 31 — Compound Component 패턴

> 날짜: 2026-04-13 | 주제: Compound Component 패턴

---

## 1. 오늘 읽을 코드

- [PublicBookShelf.tsx](../apps/page0127/src/widgets/public-library/PublicBookShelf.tsx) — 현재 단일 컴포넌트 구조
- [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — 탭 + 필터 + 목록이 한 컴포넌트에 집중된 구조

---

## 2. 핵심 개념

### Compound Component란?

**서로 연관된 컴포넌트들을 하나의 가족으로 묶는 패턴**.  
각 서브 컴포넌트가 독립적으로 보이지만, 실제로는 부모와 암묵적으로 연결되어 있다.

두 가지 형태가 있다:

| 형태 | 언제 | 예시 |
|------|------|------|
| Context 없이 | 상태 공유 불필요, 레이아웃만 분리 | `Card`, `CardHeader`, `CardContent` |
| Context 있이 | 서브 컴포넌트끼리 상태를 봐야 할 때 | `Select`, `Dialog`, `StatusTabFilter` |

**Context는 수단이지 정의가 아니다.**  
"서브 컴포넌트들이 서로의 존재를 알지 못하면서도 함께 동작한다"는 게 핵심.

```tsx
// 사용하는 쪽에서 이렇게 조합
<BookShelf>
  <BookShelf.TabList>
    <BookShelf.Tab value="all">전체</BookShelf.Tab>
    <BookShelf.Tab value="reading">읽는 중</BookShelf.Tab>
  </BookShelf.TabList>
  <BookShelf.Panel value="all">...</BookShelf.Panel>
  <BookShelf.Panel value="reading">...</BookShelf.Panel>
</BookShelf>
```

### Context로 상태 공유

```tsx
// 1. Context 만들기
type BookShelfContextType = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const BookShelfContext = createContext<BookShelfContextType | null>(null);

// 2. Context를 쓰는 커스텀 훅 (null 안전성 확보)
const useBookShelf = () => {
  const ctx = useContext(BookShelfContext);
  if (!ctx) throw new Error('BookShelf 안에서만 사용 가능');
  return ctx;
};
```

### 서브 컴포넌트를 프로퍼티로 붙이기

```tsx
// 3. 부모 컴포넌트 + 서브 컴포넌트 정의
export const BookShelf = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState('all');

  return (
    // Context.Provider로 상태를 자식 전체에 공급
    <BookShelfContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </BookShelfContext.Provider>
  );
};

const Tab = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { activeTab, setActiveTab } = useBookShelf(); // Context에서 꺼냄
  return (
    <button
      onClick={() => setActiveTab(value)}
      data-active={activeTab === value} // CSS에서 [data-active=true] 활용
    >
      {children}
    </button>
  );
};

const Panel = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { activeTab } = useBookShelf();
  if (activeTab !== value) return null; // 해당 탭일 때만 렌더
  return <div>{children}</div>;
};

// 4. 서브 컴포넌트를 프로퍼티로 붙여서 네임스페이스 형성
BookShelf.Tab = Tab;
BookShelf.Panel = Panel;
```

---

## 3. page0127 실제 코드와의 연결

### 현재 구조의 문제

`DashboardBookList.tsx`는 한 컴포넌트 안에 **탭 + 필터 + 목록 렌더링**이 모두 있다.

```tsx
// DashboardBookList.tsx — 265줄짜리 컴포넌트
// props가 15개 이상 → 사용하는 쪽에서 모두 전달해야 함
type DashboardBookListProps = {
  books: Book[];
  categories: CategoryReadingData[];
  selectedMonth?: number | null;
  selectedCategory: string | null;
  selectedRating?: number | null;
  searchQuery: string;
  statusFilter: BookStatus | 'all';
  onCategoryChange: (category: string | null) => void;
  onRemoveMonthFilter?: () => void;
  onRemoveRatingFilter?: () => void;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: BookStatus | 'all') => void;
  renderBooks?: (filteredBooks: Book[]) => React.ReactNode;
  onResetAll?: () => void;
  showViewAll?: boolean;
};
```

`PublicBookShelf.tsx`는 단순 렌더링만 담당하는 좋은 예시지만,  
탭 전환 기능을 추가하려면 props가 또 늘어나는 구조가 된다.

### Compound Component로 개선하면?

```tsx
// 사용하는 쪽이 훨씬 명확해진다
<BookShelf defaultTab="all">
  <BookShelf.TabList>
    <BookShelf.Tab value="all">전체</BookShelf.Tab>
    <BookShelf.Tab value="reading">읽는 중</BookShelf.Tab>
    <BookShelf.Tab value="want">읽고 싶은</BookShelf.Tab>
  </BookShelf.TabList>

  <BookShelf.Panel value="all">
    <PublicBookShelf books={allBooks} />
  </BookShelf.Panel>
  <BookShelf.Panel value="reading">
    <PublicBookShelf books={readingBooks} />
  </BookShelf.Panel>
</BookShelf>
```

→ props drilling 없이 탭 상태가 자동으로 Panel까지 흐름

---

## 4. 정리 규칙

| 패턴 | 언제 쓰나 | 핵심 |
|------|----------|------|
| Compound Component | 서로 연관된 UI 조각을 조합할 때 | Context + 서브 컴포넌트를 프로퍼티로 |
| Render Props | 렌더 로직을 외부에서 주입할 때 | `renderBooks` prop처럼 |
| 단순 컴포넌트 | 독립적이고 상태가 없을 때 | PublicBookShelf처럼 |

> **1줄 규칙**: Compound Component = Context로 상태를 공유하는 컴포넌트 패밀리

---

## 5. 오늘 실험

**실험 1 — 최소 구현 직접 만들어보기**

```bash
# apps/page0127/src/shared/ui/ 아래에 파일 만들기
touch apps/page0127/src/shared/ui/BookShelfTabs.tsx
```

아래 코드를 직접 타이핑해보자:

```tsx
'use client';

import { createContext, useContext, useState } from 'react';

type TabsContextType = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const TabsContext = createContext<TabsContextType | null>(null);

const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs 컴포넌트 안에서만 사용 가능');
  return ctx;
};

type TabsProps = {
  defaultTab: string;
  children: React.ReactNode;
};

export const Tabs = ({ defaultTab, children }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
};

type TabProps = {
  value: string;
  children: React.ReactNode;
};

const Tab = ({ value, children }: TabProps) => {
  const { activeTab, setActiveTab } = useTabs();
  return (
    <button
      onClick={() => setActiveTab(value)}
      style={{ fontWeight: activeTab === value ? 'bold' : 'normal' }}
    >
      {children}
    </button>
  );
};

type PanelProps = {
  value: string;
  children: React.ReactNode;
};

const Panel = ({ value, children }: PanelProps) => {
  const { activeTab } = useTabs();
  if (activeTab !== value) return null;
  return <div>{children}</div>;
};

// 서브 컴포넌트를 프로퍼티로 붙이기
Tabs.Tab = Tab;
Tabs.Panel = Panel;
```

**실험 2 — 적용해보기**

임시 페이지나 기존 페이지 한 곳에 아래처럼 적용해보자:

```tsx
<Tabs defaultTab="shelf">
  <div style={{ display: 'flex', gap: 8 }}>
    <Tabs.Tab value="shelf">책장</Tabs.Tab>
    <Tabs.Tab value="list">목록</Tabs.Tab>
  </div>

  <Tabs.Panel value="shelf">
    <p>책장 뷰 영역</p>
  </Tabs.Panel>
  <Tabs.Panel value="list">
    <p>목록 뷰 영역</p>
  </Tabs.Panel>
</Tabs>
```

탭을 눌렀을 때 Panel이 바뀌는지 확인한다.

---

## 6. "같은 UI를 여러 맥락에서 재사용" — 실제 사례

이 프로젝트에서 `DashboardBookList`는 **두 곳**에서 사용된다.

```
DashboardContent.tsx      ← 내 대시보드 (로그인한 나)
PublicLibraryContent.tsx  ← 공개 서재 (다른 사람이 보는 내 프로필)
```

두 곳 모두 **상태별 탭(전체/완독/읽는 중)** 이 필요하고, 둘 다 이렇게 씀:

```tsx
// DashboardContent.tsx
<DashboardBookList
  statusFilter={statusFilter}           // 15개 props 중 하나
  onStatusChange={(status) => dispatch(...)}
  renderBooks={(books) => <PublicBookShelf books={books} />}
  ...나머지 12개 props
/>

// PublicLibraryContent.tsx — 거의 같은 탭 UI인데 또 똑같이 props 전달
<DashboardBookList
  statusFilter={statusFilter}
  onStatusChange={(status) => setStatusFilter(status)}
  renderBooks={(books) => <PublicBookShelf books={books} username={username} />}
  ...나머지 props
/>
```

### 문제: 탭 UI는 같은데, 쓸 때마다 같은 props를 반복 전달

탭의 생김새와 동작은 똑같다. 하지만 `statusFilter`와 `onStatusChange`를 **매번 바깥에서 만들어서 넣어줘야** 한다. 컴포넌트가 자기 상태를 못 가져서 생기는 일이다.

### Compound Component로 바꾸면

```tsx
// 탭 상태는 BookFilter 안에서 스스로 관리
// 바깥은 "어떤 탭을 보여줄지"만 조합하면 됨

// DashboardContent.tsx
<BookFilter>
  <BookFilter.TabList>
    <BookFilter.Tab value="all">전체</BookFilter.Tab>
    <BookFilter.Tab value="reading">읽는 중</BookFilter.Tab>
    <BookFilter.Tab value="done">완독</BookFilter.Tab>
  </BookFilter.TabList>
  <BookFilter.Panel value="all">
    <PublicBookShelf books={allBooks} />
  </BookFilter.Panel>
  {/* ... */}
</BookFilter>

// PublicLibraryContent.tsx — 구조 동일, 내용만 다름
<BookFilter>
  <BookFilter.TabList>
    <BookFilter.Tab value="all">전체</BookFilter.Tab>
    <BookFilter.Tab value="reading">읽는 중</BookFilter.Tab>
  </BookFilter.TabList>
  <BookFilter.Panel value="all">
    <PublicBookShelf books={allBooks} username={username} />  {/* username만 다름 */}
  </BookFilter.Panel>
</BookFilter>
```

`statusFilter`, `onStatusChange` props가 사라졌다. 탭 상태는 `BookFilter` 내부 Context가 들고 있고, `Tab`과 `Panel`이 각자 꺼내 쓴다.

### 정리: 언제 Compound Component가 필요한가

```
같은 UI가 2곳 이상에서 쓰이는데
→ 매번 같은 "상태 + 핸들러" props를 반복해서 주입하고 있다면
→ Compound Component로 상태를 안으로 가져올 타이밍
```

---

## 7. 다음 Day 예고

**Day 32 — Render Props & Children as Function**

- `renderBooks` prop (DashboardBookList.tsx:72)이 왜 Render Props 패턴인지
- `children`을 함수로 넘기는 패턴
- Compound Component와 어떻게 다른지, 언제 선택하는지
