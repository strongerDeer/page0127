# Day 42 — Client Component 경계

> 목표: CC를 **어디까지** 만들지 결정한다.
> "전체를 CC로" → "leaf만 CC로" 로 경계를 밀어내는 패턴을 익힌다.

---

## 1. 오늘 다시 보는 코드 (Day 41에서 SC로 전환한 사례)

- [widgets/book/ui/BookListItem.tsx](../apps/page0127/src/widgets/book/ui/BookListItem.tsx) — 본체 SC + `LikeButton`만 CC
- [widgets/activity/ui/ActivityCard.tsx](../apps/page0127/src/widgets/activity/ui/ActivityCard.tsx) — 본체 SC + `LikeButton`/`CommentSection`만 CC
- [widgets/public-library/PublicLibraryHeader.tsx](../apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx) — `useState` 있어서 CC 유지 (정당)

---

## 2. 핵심 개념 — CC 경계 설계 원칙

### 2-0. 먼저 "leaf"가 뭔지

"leaf"는 **트리(tree) 구조**에서 온 표현. React 앱은 컴포넌트들이 부모-자식 관계로 쌓여 트리를 이룬다.

```
            App                  ← 뿌리(root)
           /   \
       Header   Page             ← 중간 노드
                 |
              BookCard           ← 중간 노드
              /   \
         Title    LikeButton     ← 잎(leaf) — 자식 없음
```

- **root** (뿌리): 가장 위 (`app/layout.tsx`)
- **중간 노드**: 자식이 있는 컴포넌트 (`Page`, `BookCard`)
- **leaf** (잎): 자식이 없는, **트리의 끝**에 있는 컴포넌트 (`Title`, `LikeButton`)

→ "CC를 leaf로 밀어낸다" = `'use client'`를 **위쪽(root 근처)** 이 아니라 **아래쪽(leaf)** 에 두라는 말.

> 💡 **비유**: `'use client'`는 **물감**이다.
> - 위쪽에 떨어뜨리면 → 아래로 다 퍼져서 전부 클라이언트가 됨
> - leaf 하나에만 칠하면 → 그 leaf만 클라이언트

### 2-1. "CC는 전염된다"의 의미

CC가 import한 **모든 자식 모듈은 클라이언트 번들로 끌려간다.**
즉 페이지 최상단을 CC로 만들면 페이지 전체가 클라이언트 렌더로 떨어진다.

```
❌ 나쁜 경계
App (CC) ─ Page (CC) ─ Header (CC) ─ Body (CC) ─ LikeButton (CC)
                                                  ↑ 사실 얘만 CC면 됐는데
```

```
✅ 좋은 경계 — CC를 leaf로 밀어냄
App (SC) ─ Page (SC) ─ Header (SC) ─ Body (SC) ─ LikeButton (CC)
```

### 2-2. 경계를 밀어내는 3가지 패턴

#### 패턴 A — 인터랙티브 자식만 CC로 분리

```tsx
// ❌ 카드 전체가 CC
'use client';
export const BookCard = ({ book }) => (
  <div>
    <h3>{book.title}</h3>
    <button onClick={() => like(book.id)}>좋아요</button>
  </div>
);

// ✅ 카드 SC + 버튼만 CC
// BookCard.tsx (SC)
export const BookCard = ({ book }) => (
  <div>
    <h3>{book.title}</h3>
    <LikeButton bookId={book.id} />
  </div>
);

// LikeButton.tsx (CC)
'use client';
export const LikeButton = ({ bookId }) => (
  <button onClick={() => like(bookId)}>좋아요</button>
);
```

#### 패턴 B — `children` prop으로 SC를 CC 안에 끼워넣기

CC가 **import**한 자식은 CC가 되지만, `children`으로 **전달받은** 자식은 SC를 유지한다.

```tsx
// CC 부모
'use client';
export const Modal = ({ children }) => {
  const [open, setOpen] = useState(false);
  return open ? <div>{children}</div> : null;
};

// SC 페이지
import { Modal } from './Modal';
import { ExpensiveServerContent } from './ExpensiveServerContent'; // SC

export default function Page() {
  return (
    <Modal>
      <ExpensiveServerContent /> {/* SC로 그대로 유지! */}
    </Modal>
  );
}
```

#### 패턴 C — Provider는 layout에서 한 번만 감싸기

`QueryProvider`, `ThemeProvider` 같은 Context Provider는 CC지만,
**layout.tsx에서 children만 감싸면** 자식은 SC를 유지한다.

```tsx
// shared/providers/QueryProvider.tsx (CC)
'use client';
export const QueryProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// app/layout.tsx (SC)
import { QueryProvider } from '@/shared/providers/QueryProvider';
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>{children}</QueryProvider> {/* children은 SC */}
      </body>
    </html>
  );
}
```

---

## 3. page0127 실제 사례

### 사례 1 — `BookListItem` (패턴 A)

[widgets/book/ui/BookListItem.tsx:121](../apps/page0127/src/widgets/book/ui/BookListItem.tsx#L121)

Day 41에서 본체의 `'use client'`를 지웠다. 이유:

```tsx
// 본체: SC
export const BookListItem = ({ book, ... }) => (
  <article>
    <BookListItem.Cover ... />     {/* SC */}
    <BookListItem.Content ... />   {/* SC, 안에 LikeButton(CC)만 import */}
  </article>
);
```

→ `LikeButton`이 자기 자신의 `'use client'`를 가지므로, 본체가 SC여도
   해당 leaf만 클라이언트 번들에 들어간다.

### 사례 2 — `ActivityCard` (패턴 A)

[widgets/activity/ui/ActivityCard.tsx:63](../apps/page0127/src/widgets/activity/ui/ActivityCard.tsx#L63)

```tsx
// 본체: SC (Day 41에서 전환)
export const ActivityCard = ({ activity, ... }) => (
  <div>
    {/* ... 사용자 정보, 책 정보 모두 SC로 렌더 ... */}
    <LikeButton activityId={activity.id} ... />     {/* CC */}
    <CommentSection activityId={activity.id} ... /> {/* CC */}
  </div>
);
```

→ 카드의 90%는 SC로 서버 렌더, 인터랙티브 leaf 2개만 CC.

### 사례 3 — `PublicLibraryHeader` (패턴 A 한 단계 더)

[widgets/public-library/PublicLibraryHeader.tsx:104](../apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx#L104)

본체에 `useState`로 모달 토글이 있어서 CC가 정당하다.
하지만 내부 `Avatar`, `Info` 서브컴포넌트는 hook을 안 쓴다.

```tsx
'use client'; // 정당 — useState 사용
export const PublicLibraryHeader = ({ profile, ... }) => {
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  return (
    <>
      <PublicLibraryHeader.Avatar profile={profile} ... />  {/* 이론상 SC 가능 */}
      <PublicLibraryHeader.Info ... />                       {/* 이론상 SC 가능 */}
    </>
  );
};
```

→ 같은 파일에 있어서 CC로 끌려간다. **분리하려면 별도 파일로 빼서
   부모에서 `children`/`props`로 받아야 한다** (패턴 B).

```tsx
// 분리 시 — SC로 유지 가능
// PublicLibraryHeaderAvatar.tsx (SC, 별도 파일)
export const PublicLibraryHeaderAvatar = ({ profile, ... }) => ( ... );

// PublicLibraryHeader.tsx (CC)
'use client';
import { useState } from 'react';
export const PublicLibraryHeader = ({ avatar, info, ... }) => {
  const [open, setOpen] = useState(false);
  return <>{avatar}{info}</>;
};

// page.tsx (SC)
<PublicLibraryHeader
  avatar={<PublicLibraryHeaderAvatar profile={profile} ... />}
  info={<PublicLibraryHeaderInfo ... />}
/>
```

> 단, page0127는 현재 같은 파일 안에 두는 게 **응집도** 측면에서 더 읽기 쉬워 그대로 유지.
> 번들 크기가 문제가 될 때만 분리 고려.

### 사례 4 — `QueryProvider` (패턴 C)

[shared/providers/QueryProvider.tsx](../apps/page0127/src/shared/providers/QueryProvider.tsx) → layout에서 한 번만 감싸기 때문에
`QueryClient`만 클라이언트 번들에 들어가고, **자식 페이지들은 모두 SC**.

---

## 4. 정리 표 — CC 경계 결정 플로우

```
컴포넌트에 hook/이벤트/브라우저 API/Context가 필요한가?
├─ NO  → SC (Day 41에서 처리)
└─ YES → CC가 필요
         ↓
         해당 인터랙티브 부분만 별도 leaf 컴포넌트로 분리 가능한가?
         ├─ YES → leaf만 'use client', 부모는 SC 유지
         └─ NO  → 부모가 CC. 단, children을 props로 받아 SC를 끼워넣을 수 있는지 검토
```

### 한 줄 규칙

> **`'use client'`는 최대한 트리의 leaf에 둬라. 상위에 둘수록 그 아래 전부가 클라이언트 번들로 끌려간다.**

---

## 5. 오늘 실험

1. **`PublicLibraryHeader.Avatar`/`Info`를 별도 파일로 추출**해서 부모가 `props`로 받게 리팩토링.
   → 자식들이 SC로 유지되는지 (`React Server Component` 표기) Next.js dev 도구로 확인.
2. **번들 사이즈 측정** — `npm run build` 후 `.next/analyze` (또는 `next build` 출력의 First Load JS)를
   Day 41 작업 전/후로 비교. 어느 페이지에서 가장 많이 줄었는지 기록.

---

## 6. 다음 Day 예고

**Day 43 — lazy + Suspense ✨**
Recharts 같은 큰 클라이언트 라이브러리를 `lazy()` + `<Suspense>`로 코드 스플리팅.
초기 번들에서 차트 코드를 빼내 LCP를 개선한다.
