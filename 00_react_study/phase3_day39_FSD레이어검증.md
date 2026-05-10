# Day 39 — Phase 3 복습: FSD 레이어 의존 방향 검증

> page0127의 import 그래프를 실제로 그려보고, **방향이 깨진 곳이 없는지** 확인한다. 이론이 아니라 grep 결과로 진단.

---

## 1. 오늘 확인할 코드

- [src/shared/](apps/page0127/src/shared/) — 가장 아래 레이어
- [src/entities/](apps/page0127/src/entities/)
- [src/features/](apps/page0127/src/features/)
- [src/widgets/](apps/page0127/src/widgets/) — 가장 위
- 검증 대상: 위 4개 레이어 간 import 그래프

---

## 2. 핵심 개념 — FSD 의존 방향 규칙

### 2-1. 한 방향 규칙

```
app  →  pages  →  widgets  →  features  →  entities  →  shared
                       (위에서 아래로만 import 가능)
```

- **위 레이어가 아래 레이어를 import 한다** (✅)
- **아래 레이어가 위 레이어를 import 한다** (❌ 위반)
- **같은 레이어 안의 다른 슬라이스를 import 한다** (⚠️ 회색지대)

### 2-2. 슬라이스 vs 레이어

```
features/        ← 레이어 (layer)
  ├─ auth/       ← 슬라이스 (slice)
  ├─ book/       ← 슬라이스
  └─ comment/    ← 슬라이스
```

**슬라이스 간 import** (예: `features/comment`이 `features/auth`를 import)는 FSD 원칙상 권장되지 않는다. → cross-import는 보통 **shared로 끌어내리거나**, **상위 레이어(widgets)에서 조립**한다.

### 2-3. 왜 이 방향이 중요한가

- **재사용성**: `shared`는 어디서나 import 가능 → 가장 안정적이어야 함
- **삭제 용이성**: `entities/book`을 지울 때 `entities` 안만 보면 됨 → 위 레이어가 침범하지 않으니까
- **레이어 추론**: 파일 경로만 봐도 "이 코드의 역할/범위"가 보임

---

## 3. page0127 실제 검증 결과

각 레이어가 **어디로 import 하는지**를 grep으로 확인:

### 3-1. shared → ?

```
@/entities/book   ← ❌ 위반! (1건)
@/shared/lib      ← ✅ 자기 자신
```

**위반 위치**: [src/shared/ui/StatusTabFilter.tsx:5](apps/page0127/src/shared/ui/StatusTabFilter.tsx#L5)

```ts
import type { BookStatus } from '@/entities/book/types';
```

> shared는 가장 아래 레이어인데 entities의 타입을 끌어쓰고 있다. `BookStatus` 같은 도메인 타입은 entities에 살아야 맞고, shared/ui의 필터 컴포넌트는 **제네릭하게** 받아야 한다.

### 3-2. entities → ?

```
@/entities/follow   ← ⚠️ 슬라이스 교차 (1건)
@/shared/api        ← ✅
@/shared/config     ← ✅
@/shared/lib        ← ✅
```

**슬라이스 교차**: [src/entities/user/api/userApi.ts:4](apps/page0127/src/entities/user/api/userApi.ts#L4)

```ts
import { UserWithFollowInfo } from '@/entities/follow';
```

> `user`가 `follow`를 알고 있다. user-follow 결합이 강해질 거라면 한 슬라이스로 합치거나, 합쳐진 타입을 위 레이어에서 만들 것.

### 3-3. features → ?

```
@/entities/*    ← ✅ (8개 슬라이스 모두 정상)
@/shared/*      ← ✅
@/features/*    ← ⚠️ 슬라이스 교차 다수
```

**슬라이스 교차 사례**:

| 위치                                                                                   | import                                          |
| -------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [features/activity/ui/ActivityCard.tsx](apps/page0127/src/features/activity/ui/ActivityCard.tsx) | `CommentSection`, `LikeButton`                  |
| [features/comment/ui/CommentItem.tsx](apps/page0127/src/features/comment/ui/CommentItem.tsx)     | `useCurrentUserContext` from `features/auth/providers` |
| [features/user/ui/UserSearch.tsx](apps/page0127/src/features/user/ui/UserSearch.tsx)             | `UserCard` from `features/follow/ui`            |

> `auth/providers`는 **모든 feature가 의존하는 공통**이라 사실상 `shared`로 끌어내리거나 `app/providers`로 옮기는 게 깔끔하다. `ActivityCard`의 경우는 widgets 레이어에서 조립하는 게 정석.

### 3-4. widgets → ?

```
@/entities/*    ← ✅
@/features/*    ← ✅
@/shared/*      ← ✅
@/widgets/*     ← ⚠️ 슬라이스 교차 (DashboardContent → PublicBookShelf)
@/app/api/*     ← ❌ 역방향! (2건)
```

**역방향 위반**: widgets가 app 레이어를 import

```
src/widgets/book/ui/ReaderProfiles.tsx → @/app/api/_helpers/auth
src/widgets/book/ui/MyBookMemo.tsx     → @/app/api/_helpers/auth
```

> `app/api/_helpers/auth`의 `getSupabaseClient`, `getCurrentUser`는 본래 server-only 헬퍼다. 클라이언트 widget이 직접 호출하면 안 되고, **shared/config/supabase** 또는 **entities/.../api**로 끌어내려야 한다.

---

## 4. 정리표 — 의존 방향 진단

| 방향               | 건수 | 판정             | 조치                                            |
| ------------------ | ---- | ---------------- | ----------------------------------------------- |
| widgets → features | 다수 | ✅ 정상          | -                                               |
| widgets → entities | 다수 | ✅ 정상          | -                                               |
| widgets → shared   | 다수 | ✅ 정상          | -                                               |
| features → entities | 다수 | ✅ 정상         | -                                               |
| features → shared  | 다수 | ✅ 정상          | -                                               |
| entities → shared  | 다수 | ✅ 정상          | -                                               |
| **shared → entities** | **1** | **❌ 위반**   | `BookStatus`를 props로 받게 제네릭화            |
| **widgets → app** | **2** | **❌ 위반**     | server helper를 shared/entities로 이동          |
| entities ↔ entities | 1   | ⚠️ 교차         | user-follow 결합 재검토                         |
| features ↔ features | 다수 | ⚠️ 교차         | `auth/providers`는 shared 또는 app으로 승격     |

**한 줄 규칙**: import 화살표는 **위에서 아래로**만 향한다. 같은 레이어를 교차해서 import 하면 → "둘 다 위 레이어에서 조립"하거나 "공통을 아래로 끌어내림".

---

## 5. 오늘 실험 — **실제 수정 결과**

### 실험 1 ✅ — `shared/ui/StatusTabFilter` 일반화 완료

**전략 결정**: 제네릭 `<T extends string>`도 가능하지만, Compound Component 패턴(`StatusTabFilter.Tab`)에서는 Context 타입 제네릭화가 까다롭다. → **`string`으로 단순화**하고 도메인 좁힘은 호출 측 책임으로.

**Before** ([shared/ui/StatusTabFilter.tsx](apps/page0127/src/shared/ui/StatusTabFilter.tsx))

```tsx
import type { BookStatus } from '@/entities/book/types'; // ❌ 역방향
type StatusValue = BookStatus | 'all';

type StatusTabFilterContextType = {
  activeValue: StatusValue;
  onChange: (value: StatusValue) => void;
};
```

**After**

```tsx
// FSD: shared 레이어는 도메인을 몰라야 한다
// → BookStatus(=entities/book) import를 제거하고 string으로 일반화
// 사용처(features/stats)가 value에 의미를 부여한다
type StatusTabFilterContextType = {
  activeValue: string;
  onChange: (value: string) => void;
  isPending?: boolean;
};
```

**호출 측 어댑터** ([features/stats/ui/DashboardBookList.tsx:277-281](apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L277-L281))

```tsx
// shared/ui는 도메인을 모르므로 value는 string. 여기서 BookStatus로 좁힌다
<StatusTabFilter
  value={statusFilter}
  onChange={(value) => handleStatusChange(value as BookStatus | 'all')}
  isPending={isTabPending}
>
```

> **왜 함수 contravariance 때문에 어댑터가 필요한가?**
> `(value: string) => void` 자리에 `(status: BookStatus | 'all') => void`를 그냥 넣으면 TS 에러.
> 좁은 타입만 받는 함수는 넓은 타입을 받는 자리에 못 들어간다 (호출자가 더 넓은 값을 보낼 수 있으므로).
> 그래서 인라인 래퍼로 `string → BookStatus | 'all'` 변환을 명시.

**검증 결과**

```bash
$ grep -rn "from '@/entities" src/shared
(결과 없음)

$ npx tsc --noEmit | grep StatusTabFilter
(결과 없음)
```

→ shared → entities 위반 **1건 → 0건**.

---

### 실험 2 ✅ — `widgets/book` 서버 헬퍼 위반 수정 완료

**원인**: [app/api/_helpers/auth.ts](apps/page0127/app/api/_helpers/auth.ts)의 `getSupabaseClient`는 사실 `@/shared/config/supabase/server`의 `createClient()`를 그냥 호출하는 **얇은 래퍼**다. widget이 굳이 app 레이어 경유할 이유가 없다.

또 `getCurrentUser`는 미인증 시 `NextResponse.json(401)`을 반환하는 **route handler 전용** 함수라, server component인 widget에서는 NextResponse 분기가 의미 없음.

**수정 1 — ReaderProfiles**

```diff
- import { getSupabaseClient } from '@/app/api/_helpers/auth';
+ import { createClient } from '@/shared/config/supabase/server';

- const supabase = await getSupabaseClient();
+ const supabase = await createClient();
```

**수정 2 — MyBookMemo** (`getCurrentUser` 인라인화)

```diff
- import { getSupabaseClient, getCurrentUser } from '@/app/api/_helpers/auth';
+ import { createClient } from '@/shared/config/supabase/server';

- const supabase = await getSupabaseClient();
- const { user } = await getCurrentUser();
+ const supabase = await createClient();
+ const { data: { user } } = await supabase.auth.getUser();
```

**검증 결과**

```bash
$ grep -rn "from '@/app" src/widgets src/features src/entities src/shared
(결과 없음)

$ npx tsc --noEmit | grep -E "ReaderProfiles|MyBookMemo"
(결과 없음)
```

→ widgets → app 위반 **2건 → 0건**.

---

### 수정 후 import 방향 최종 진단

| 방향                  | 수정 전 | 수정 후 | 비고                            |
| --------------------- | ------- | ------- | ------------------------------- |
| shared → entities     | ❌ 1    | ✅ 0    | StatusTabFilter 일반화          |
| widgets → app         | ❌ 2    | ✅ 0    | createClient 직접 호출          |
| entities ↔ entities   | ⚠️ 1    | ⚠️ 1    | user-follow 결합 — 별도 작업    |
| features ↔ features   | ⚠️ 다수 | ⚠️ 다수 | auth/providers 승격 — 별도 작업 |

남은 슬라이스 교차는 구조적 리팩토링이 필요하므로 **다음 작업으로 분리**.

---

## 6. 다음 Day 예고

**Day 40 — Phase 4 시작 (성능 최적화: React.memo)**: `useMemo`/`useCallback`을 넘어서 컴포넌트 단위 memoization은 언제 효과가 있고 언제 무의미한지. page0127의 리스트 컴포넌트(`DashboardBookList`, `PublicBookShelf`)에서 적용 후보 찾기.
