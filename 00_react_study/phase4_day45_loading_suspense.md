# Day 45 — loading.tsx / Suspense

## 1. 오늘 읽을 코드

- [src/features/book/ui/BookCardSkeleton.tsx](../apps/page0127/src/features/book/ui/BookCardSkeleton.tsx)
- [src/shared/ui/skeleton.tsx](../apps/page0127/src/shared/ui/skeleton.tsx)
- [app/(public)/page.tsx](../apps/page0127/app/(public)/page.tsx) — Suspense 적용 후보

---

## 2. 핵심 개념

### Server Component에서의 로딩 처리

Server Component는 `await`로 비동기 데이터를 받기 때문에 **로딩 상태를 어떻게 보여줄지 React 단에서 결정할 수 없다**. → 이걸 해결하는 게 `loading.tsx`와 `Suspense`.

### loading.tsx — 라우트 단위 로딩 UI

```
app/
 └─ (protected)/
     └─ books/
         ├─ page.tsx       ← 데이터 페칭하는 SC
         └─ loading.tsx    ← 페이지 로딩 중 자동 노출
```

Next.js가 `page.tsx`를 React Suspense로 **자동으로 감싸고**, 같은 경로의 `loading.tsx`를 fallback으로 사용한다.

```tsx
// app/(protected)/books/loading.tsx
import { BookCardSkeleton } from '@/features/book/ui/BookCardSkeleton';

export default function Loading() {
  return (
    <div className='grid gap-4'>
      {Array.from({ length: 6 }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Suspense — 컴포넌트 단위 로딩 UI

`loading.tsx`는 페이지 전체 단위라 **거친 단위**다. 한 페이지 안에서 부분만 스트리밍하려면 `<Suspense>`로 감싼다.

```tsx
import { Suspense } from 'react';

<Suspense fallback={<BookCardSkeleton />}>
  <BookList /> {/* 내부에서 await */}
</Suspense>
```

→ `BookList`가 데이터를 받는 동안 fallback이 보이고, 나머지 페이지는 먼저 렌더링된다 (**Streaming SSR**).

### 둘의 차이

| 위치           | 단위          | 자동 적용 | 용도                             |
| -------------- | ------------- | --------- | -------------------------------- |
| `loading.tsx`  | 라우트 segment | O         | 페이지 전체 로딩 (스켈레톤 화면) |
| `<Suspense>`   | 컴포넌트      | X         | 페이지 내부 일부만 늦게 로드     |

규칙 1줄: **페이지 전체가 늦으면 `loading.tsx`, 일부분만 늦으면 `<Suspense>`**.

---

## 3. page0127 실제 코드 사례

### 이미 만들어둔 Skeleton 부품

```tsx
// src/shared/ui/skeleton.tsx — 기본 shimmer 박스
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='skeleton'
      className={cn('bg-accent animate-pulse rounded-md', className)}
      {...props}
    />
  );
}
```

```tsx
// src/features/book/ui/BookCardSkeleton.tsx — BookCard 모양 그대로 흉내
export const BookCardSkeleton = () => {
  return (
    <Card className='flex overflow-hidden'>
      <Skeleton className='h-48 w-36 flex-shrink-0' />
      <div className='flex flex-1 flex-col p-6'>
        <Skeleton className='h-6 w-3/4' /> {/* 제목 */}
        <Skeleton className='h-4 w-1/2' /> {/* 저자/출판사 */}
        {/* ... */}
      </div>
    </Card>
  );
};
```

### 진단 — 부품은 있는데 안 쓰는 중

```bash
$ grep -rln "BookCardSkeleton" apps/page0127
# → BookCardSkeleton.tsx 자기 자신만 hit
```

즉 **부품은 만들어놨지만 `loading.tsx`나 `<Suspense>`에 연결되지 않은 상태**다. 오늘 할 일은 이 부품을 실제 라우트에 꽂는 것.

### 후보 라우트

`app/(public)/page.tsx`는 주석에 이미 "Suspense & Streaming (추후 적용 가능)"이라고 적혀 있다. `BookRankingList` 두 개가 각각 RPC를 호출하는데, 둘 다 await로 직렬화돼 있어 첫 응답이 늦으면 페이지 전체가 멈춘다. → **Suspense로 감싸면 각자 스트리밍 가능**.

---

## 4. 정리 표

| 상황                                    | 답                                       |
| --------------------------------------- | ---------------------------------------- |
| `/books` 페이지 진입 시 로딩 화면       | `app/(protected)/books/loading.tsx` 추가 |
| 메인 페이지의 랭킹 2개를 개별 스트리밍  | 각각 `<Suspense fallback={...}>`로 감싸기 |
| skeleton의 개수는?                      | 화면에 보일 카드 수와 동일하게 (보통 6~8) |
| fallback에는 무엇을 넣나?               | 실제 컴포넌트와 **레이아웃 동일한 모양**  |

---

## 5. 오늘 실험

1. **`loading.tsx` 추가하기**

   ```bash
   touch apps/page0127/app/\(protected\)/dashboard/loading.tsx
   ```

   `BookCardSkeleton`을 6개 그리드로 배치. dev 모드에서 `/dashboard` 진입 시 깜빡 보이는지 확인 (네트워크 throttling으로 Slow 3G 켜면 확실히 보임).

2. **Suspense로 랭킹 분리 스트리밍**

   `app/(public)/page.tsx`의 두 RPC 호출을 별도 async Server Component(`<BooksOfLifeSection />`, `<MostReadBooksSection />`)로 분리하고 각각 `<Suspense>`로 감싸기. 어느 쪽이 먼저 떠오르는지 Network 탭에서 확인.

---

## 6. 다음 Day 예고

**Day 46 — TanStack Query: queryKey 설계**.
현재 코드의 `useQuery` 사용처를 전수 조사하고 queryKey 네이밍 컨벤션을 통일한다. SC/`loading.tsx`로 처리 못 하는 **클라이언트 단 캐싱**으로 영역이 넘어간다.
