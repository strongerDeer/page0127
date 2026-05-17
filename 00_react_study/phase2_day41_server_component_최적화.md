# Day 41 — Server Component 최적화

> 목표: 현재 page0127에서 **불필요하게 `'use client'`로 마킹된 컴포넌트**를 찾아내고,
> 어떤 기준으로 SC/CC를 분리해야 하는지 정리한다.

---

## 1. 오늘 점검한 코드

- [shared/ui/ReadCountBadge.tsx](../apps/page0127/src/shared/ui/ReadCountBadge.tsx)
- [shared/ui/user-avatar.tsx](../apps/page0127/src/shared/ui/user-avatar.tsx)
- [widgets/book/ui/BookListItem.tsx](../apps/page0127/src/widgets/book/ui/BookListItem.tsx)
- [widgets/public-library/PublicLibraryHeader.tsx](../apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx)

---

## 2. 핵심 개념 — Server Component를 써야 하는 이유

### 2-1. SC는 JS 번들에서 빠진다

CC로 마킹된 컴포넌트는 **컴포넌트 코드 + 사용하는 모든 라이브러리**가 클라이언트 JS 번들에 포함된다.
SC는 서버에서 HTML만 만들어 보내므로 번들 크기 0.

```tsx
// ❌ 인터랙션 없는데 CC: next/image 코드까지 묶여서 전송됨
'use client';
import Image from 'next/image';
export const Avatar = ({ src }) => <Image src={src} alt='' />;

// ✅ SC: 서버에서 <img> 태그만 그려 보냄
import Image from 'next/image';
export const Avatar = ({ src }) => <Image src={src} alt='' />;
```

### 2-2. `'use client'`가 정말 필요한 4가지 신호

| 신호                   | 예시                                  |
| ---------------------- | ------------------------------------- |
| React 훅 사용          | `useState`, `useEffect`, `useRef` ... |
| 이벤트 핸들러          | `onClick`, `onChange`, `onSubmit` ... |
| 브라우저 전용 API      | `window`, `localStorage`, `navigator` |
| Context Provider 소비  | `useContext`, `useQuery` 등           |

→ **위 중 어느 것도 안 쓰면 CC일 이유가 없다.**

### 2-3. CC 안에서 SC를 import 할 수 없다 (역방향만 가능)

CC는 자식으로 SC를 **렌더링**할 수는 있지만 (`children`/`props`로 전달받을 때),
**import 하는 순간** 그 자식은 CC로 끌려 들어간다.

```tsx
// CC 부모
'use client';
import { ServerChild } from './ServerChild'; // ❌ ServerChild가 CC가 됨

// 대신 props로 받기
export const ClientParent = ({ children }) => <div>{children}</div>;
// 그리고 SC 페이지에서
<ClientParent><ServerChild /></ClientParent> // ✅
```

---

## 3. page0127 실제 사례 — 불필요한 `'use client'` 후보

### ❌ 후보 1: `ReadCountBadge` — 인터랙션 0

[shared/ui/ReadCountBadge.tsx:1](../apps/page0127/src/shared/ui/ReadCountBadge.tsx#L1)

```tsx
'use client'; // ← 왜?
// hook 없음, 이벤트 없음, 그냥 props로 받은 숫자로 <span> 렌더
export const ReadCountBadge = ({ readCount, ... }) => {
  if (readCount <= 1) return null;
  return <span ...>{readCount}회독</span>;
};
```

→ **순수 표시 컴포넌트**. SC로 전환 시 번들 크기 줄고, 동작 동일.

---

### ❌ 후보 2: `UserAvatar` — next/image + 분기만

[shared/ui/user-avatar.tsx:1](../apps/page0127/src/shared/ui/user-avatar.tsx#L1)

```tsx
'use client';
import Image from 'next/image';
export const UserAvatar = ({ photoUrl, nickname, isDeleted, ... }) => {
  if (isDeleted || !photoUrl) return <div>...</div>; // 기본 아바타
  return <Image src={photoUrl} ... />;
};
```

→ 상태도, 이벤트도 없음. **`Image` 컴포넌트는 SC에서도 잘 동작한다.**
→ `user-avatar`가 `shared/ui`라 곳곳에서 import 됨 → CC 전염 영향이 큼.

---

### ⚠️ 후보 3: `BookListItem` — 본체는 SC 가능, LikeButton만 CC

[widgets/book/ui/BookListItem.tsx:1](../apps/page0127/src/widgets/book/ui/BookListItem.tsx#L1)

본체는 props만 받아 `<Link>`, `<Image>`, 자식 컴포넌트를 렌더링한다.
유일한 CC 요소는 내부 `LikeButton` (좋아요 토글).

```tsx
'use client'; // ← 본체는 사실 SC여도 됨
import { LikeButton } from './LikeButton'; // 이놈만 CC

export const BookListItem = ({ book, rank, ... }) => (
  <article>
    <BookListItem.Cover ... />
    <BookListItem.Content ... /> {/* 안에 LikeButton */}
  </article>
);
```

→ `BookListItem` 자체는 SC로 두고, `LikeButton`만 CC 경계로 분리하면 OK.
→ Next.js가 자동으로 `LikeButton` 부분만 클라이언트 번들에 포함.

---

### ✅ 정당한 CC: `PublicLibraryHeader`

[widgets/public-library/PublicLibraryHeader.tsx:110](../apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx#L110)

```tsx
'use client';
import { useState } from 'react';

export const PublicLibraryHeader = ({ profile, ... }) => {
  const [followersModalOpen, setFollowersModalOpen] = useState(false); // ← 정당
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  ...
};
```

→ `useState`로 모달 토글 관리 → **CC가 맞다.**
→ 다만 내부 서브컴포넌트(`Avatar`, `Info`)는 상태를 안 쓰므로,
   상위가 CC인 한 굳이 분리할 필요는 없지만 **재사용한다면 SC로 빼낼 수 있다.**

---

## 4. 판별 규칙 — 한 줄 요약

> **컴포넌트 안에서 hook / 이벤트 / 브라우저 API / Context 중 하나라도 쓰지 않으면 `'use client'`를 지워라.**

| 패턴                                | 결정    |
| ----------------------------------- | ------- |
| props 받아서 JSX만 렌더             | **SC**  |
| `useState`/`useEffect`/`useRef`     | **CC**  |
| `onClick`/`onChange` 등 이벤트      | **CC**  |
| `useQuery`/`useMutation` 등 훅      | **CC**  |
| `next/image`, `next/link`만 사용    | **SC**  |
| 자식으로 CC를 렌더링만 함           | **SC**  |

---

## 5. 오늘 실험

1. **`ReadCountBadge`에서 `'use client'`를 지워보고** 빌드/실행해 본다.
   → 정상 동작하는지, Network 탭에서 JS 청크 크기가 줄어드는지 확인.
2. **`'use client'` 사용 파일 전수 조사** — `grep -rl "'use client'" src/` 결과를 보고,
   각 파일을 열어 위 판별 규칙 표를 적용해 "CC 필요/불필요" 라벨링.
   → 불필요 라벨이 붙은 것 중 `shared/ui/*`를 우선 정리 (영향 범위가 가장 큼).

---

## 6. 다음 Day 예고

**Day 42 — Client Component 경계**
오늘 찾은 "불필요한 CC"를 실제로 SC로 전환하고,
CC가 필요한 경우엔 **경계를 어디에 그을지** (가장 안쪽 leaf로 밀어내는 패턴)를 다룬다.
