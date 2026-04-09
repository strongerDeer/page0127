# Day 30 — Portal: createPortal로 DOM 탈출하기

> 오늘 읽을 코드:
> - [NotificationDropdown.tsx](../apps/page0127/src/features/notification/ui/NotificationDropdown.tsx)
> - [shared/ui/popover.tsx](../apps/page0127/src/shared/ui/popover.tsx)

---

## 1. Portal이란?

Portal = **React 컴포넌트를 DOM의 다른 위치에 렌더링하는 것**

React는 보통 컴포넌트를 부모 안에 렌더링한다.
Portal은 "React 트리상 부모는 그대로인데, 실제 DOM은 다른 곳(주로 `body`)에 붙이는" 기능이다.

**비유**: 아파트(React 트리)에서 살지만, 주소(DOM 위치)는 옆 건물로 옮기는 것.
이웃(Context, 이벤트)과의 관계는 유지된다.

```
React 트리 (논리적 구조)          실제 DOM (브라우저)
─────────────────────            ──────────────────
App                              <body>
 └── Header                        <div id="root">
      └── NotificationDropdown        <header>...</header>
           └── 🌀 Portal             </div>
                └── Dropdown         <div>드롭다운 여기!</div>  ← body에 직접 붙음
```

---

## 2. 왜 필요한가 — z-index 함정

### 문제 상황

헤더 안에서 드롭다운을 열면 이런 일이 생긴다.

```
<header style="z-index: 100; overflow: hidden">
  <button>알림 🔔</button>
  <div class="dropdown" style="z-index: 9999">  ← 아무리 높여도 안 됨!
    ...
  </div>
</header>

<main style="z-index: 200">
  ...  ← 드롭다운이 여기에 가려짐
</main>
```

`z-index: 9999`를 줘도 드롭다운이 `<main>`에 가려진다.

### 왜?

`z-index`는 **같은 stacking context 안에서만** 비교된다.
`header`가 `z-index: 100`으로 자체 stacking context를 만들면,
그 안의 자식은 아무리 `z-index`를 높여도 `header` 레이어 안에 갇힌다.

```
stacking context 시각화:
  body (최상위)
  ├── header (z:100)
  │    └── dropdown (z:9999) → header 내에서만 9999, 전체로는 100 안
  └── main (z:200) ← header 전체보다 위
```

### 해결: Portal로 body에 직접 붙이기

```
  body (최상위)
  ├── header (z:100)
  ├── main (z:200)
  └── dropdown (z:50) ← body 바로 아래, stacking context 없음 → z:50으로도 최상위
```

Portal을 쓰면 드롭다운이 body의 직접 자식이 되어,
어떤 stacking context에도 갇히지 않는다.

---

## 3. createPortal 사용법

```tsx
import { createPortal } from 'react-dom';

const Dropdown = ({ isOpen }: { isOpen: boolean }) => {
  if (!isOpen) return null;

  return createPortal(
    // 1번째 인자: 렌더링할 JSX
    <div className='fixed right-4 top-16 z-50 w-80 rounded-xl bg-white shadow-xl'>
      드롭다운 내용
    </div>,
    // 2번째 인자: 붙일 DOM 노드
    document.body
  );
};
```

`createPortal(렌더링할_JSX, 어디에_붙일지)` — 두 개 인자가 전부다.

### Portal의 2가지 특성

```tsx
// 1. React Context는 Portal 안에서도 동작한다
const ThemeContext = createContext('light');

const App = () => (
  <ThemeContext.Provider value='dark'>
    <Header>
      {createPortal(
        // ↓ Portal 안에서도 'dark' 값을 읽을 수 있음 (React 트리 기준)
        <div>{useContext(ThemeContext)}</div>,
        document.body
      )}
    </Header>
  </ThemeContext.Provider>
);

// 2. 이벤트 버블링도 React 트리 기준
// Portal 내부 클릭 → DOM상 부모(body)가 아닌 React상 부모(Header)로 전파됨
```

---

## 4. page0127 실제 코드 사례

### Radix UI가 Portal을 이미 처리한다

`NotificationDropdown`이 쓰는 Popover는 내부에서 Portal을 자동으로 사용한다.

```tsx
// shared/ui/popover.tsx:25
<PopoverPrimitive.Portal>         {/* ← 여기서 createPortal 처리 */}
  <PopoverPrimitive.Content
    className='z-50 ...'          {/* z-50이 제대로 동작하는 이유:
                                      body 바로 아래에 붙어서
                                      헤더의 stacking context를 벗어났기 때문 */}
  />
</PopoverPrimitive.Portal>
```

```tsx
// NotificationDropdown.tsx
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger asChild>
    <Button variant='ghost' size='icon'>
      <Bell className='h-5 w-5' />
    </Button>
  </PopoverTrigger>
  <PopoverContent className='w-96 p-0' align='end'>
    {/* ↑ PopoverContent 안에서 Portal이 자동 처리됨
        → 헤더 어느 깊이에 있어도 z-index 문제 없음 */}
    <NotificationList userId={userId} onClose={() => setIsOpen(false)} />
  </PopoverContent>
</Popover>
```

**Shadcn UI / Radix UI에서 Portal을 자동 사용하는 컴포넌트들:**
`Popover`, `Dialog`, `Tooltip`, `DropdownMenu`, `Sheet`, `AlertDialog` — 전부 해당

---

## 5. 직접 createPortal로 만들면?

Radix UI 없이 직접 구현할 때 패턴:

```tsx
'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export const NotificationDropdownPortal = ({ userId }: { userId: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant='ghost' size='icon' onClick={() => setIsOpen((v) => !v)}>
        <Bell className='h-5 w-5' />
      </Button>

      {isOpen &&
        createPortal(
          <div className='fixed right-4 top-16 z-50 w-96 rounded-xl border bg-white shadow-xl'>
            <p className='p-4 text-sm text-slate-500'>알림 목록 (Portal 버전)</p>
          </div>,
          document.body  // body에 직접 붙임
        )}
    </>
  );
};
```

### 외부 클릭 시 닫기도 직접 구현해야 한다

```tsx
import { useEffect, useRef } from 'react';

const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!isOpen) return;

  const handleClickOutside = (e: MouseEvent) => {
    // ref가 가리키는 DOM 밖을 클릭했으면 닫기
    if (!dropdownRef.current?.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isOpen]);

// Portal JSX에 ref 연결:
<div ref={dropdownRef} className='fixed right-4 top-16 z-50 ...'>
```

→ 이렇게 직접 구현해보면 Radix UI가 왜 편한지 바로 느껴진다.
포지셔닝(트리거 기준 위치 계산), 외부 클릭, ESC 키, 접근성까지 다 처리해준다.

---

## 6. Portal vs 일반 렌더링

| | 일반 렌더링 | Portal |
|---|---|---|
| DOM 위치 | 컴포넌트 자리 그대로 | `body` 바로 아래 |
| React Context | 부모 Context 사용 가능 | 동일하게 사용 가능 |
| z-index | 부모 stacking context에 갇힘 | 전역에서 자유롭게 |
| 이벤트 버블링 | DOM 기준 | React 트리 기준 |
| 언제 씀 | 일반적인 UI | 모달, 드롭다운, 툴팁 |

> **규칙**: 전체 화면 위에 떠야 하는 UI → Portal (또는 Radix UI처럼 Portal을 감싸는 라이브러리)

---

## 7. page0127 실습 — alert/confirm 전면 교체 (완료)

Portal이 해결하는 문제(전체 화면 위에 UI 띄우기)를 `alert()` / `confirm()`으로 때우던 곳 6곳을 Shadcn으로 교체했다.

| 기존 | 파일 | 교체 결과 |
|---|---|---|
| `alert('내 서재에 추가되었습니다.')` | `AddToLibraryButton` | `toast.success()` |
| `alert('로그인이 필요합니다.')` | `AddToLibraryButton`, `LikeButton` | `toast.error()` |
| `alert('공개 서재 URL 복사')` | `DashboardContent` | `toast.success()` |
| `confirm('정말 삭제하시겠습니까?')` | `DeleteBookButton` | `AlertDialog` |
| `window.confirm('댓글 삭제')` | `CommentItem` | `AlertDialog` |
| `confirm('AI 취향 분석 시작')` | `DashboardContent` | `AlertDialog` |

### confirm() → AlertDialog 교체 시 핵심 포인트

`confirm()`은 동기라 흐름을 막을 수 있었다. AlertDialog는 비동기라 **로직을 두 단계로 쪼개야 한다.**

```tsx
// Before: confirm()이 흐름을 막음 (동기)
const handleDelete = async () => {
  if (!confirm('삭제하시겠습니까?')) return;  // ← 여기서 멈춤
  await deleteBook(bookId);
};

// After: 열기 → 확인을 분리 (비동기)
const [open, setOpen] = useState(false);

const handleDelete = () => setOpen(true);        // 1단계: 다이얼로그만 열기
const handleConfirm = async () => {              // 2단계: 확인 클릭 시 실행
  await deleteBook(bookId);
};
```

AlertDialog가 내부적으로 Portal을 사용하므로, z-index 문제 없이 항상 화면 최상단에 렌더링된다.

---

## 8. 오늘 실험

### 실험 1 — createPortal 직접 써보기

위의 `NotificationDropdownPortal` 코드를 실제로 만들고,
개발자 도구(Elements 탭)에서 DOM 위치가 `body` 바로 아래에 붙는지 확인한다.

### 실험 2 — 외부 클릭 닫기 붙이기

실험 1에 `useRef` + `useEffect` + `mousedown` 이벤트 리스너를 추가해서
드롭다운 바깥을 클릭하면 닫히게 만들어본다.

---

## 9. 다음 Day 예고

**Day 31 — Portal 심화**  
책 상세 모달을 Portal로 구현 + 스크롤 잠금(`document.body.style.overflow = 'hidden'`) + ESC 키 닫기 조합.
