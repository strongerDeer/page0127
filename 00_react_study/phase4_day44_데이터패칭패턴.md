# Day 44 — 데이터 패칭 패턴 (fetch + cache, revalidate)

## 1. 오늘 읽을 코드

- [app/api/books/search/route.ts](../apps/page0127/app/api/books/search/route.ts)
- [app/api/books/detail/route.ts](../apps/page0127/app/api/books/detail/route.ts)
- [src/shared/api/aladin.ts](../apps/page0127/src/shared/api/aladin.ts)

---

## 2. 핵심 개념

Next.js App Router의 `fetch`는 Web 표준 `fetch`를 확장해서, **요청 단위 캐싱 옵션**을 두 번째 인자로 받는다.

### 캐시 옵션 3가지

```typescript
// 1. force-cache (기본값) — 빌드 타임에 한 번 받아 영구 캐시 (SSG와 비슷)
fetch(url, { cache: 'force-cache' });

// 2. no-store — 매 요청마다 새로 받음 (SSR과 비슷)
fetch(url, { cache: 'no-store' });

// 3. revalidate — N초 동안 캐시 후 재검증 (ISR)
fetch(url, { next: { revalidate: 3600 } }); // 1시간
```

### 태그 기반 무효화

```typescript
fetch(url, { next: { tags: ['books'] } });

// 다른 곳에서 캐시 무효화
import { revalidateTag } from 'next/cache';
revalidateTag('books'); // 'books' 태그 붙은 모든 fetch 캐시 무효화
```

### 언제 어떤 옵션을 쓰나

| 상황                          | 옵션                          | 이유                       |
| ----------------------------- | ----------------------------- | -------------------------- |
| 거의 안 변하는 데이터 (도서)  | `revalidate: 86400` (1일)     | CDN처럼 동작, 빠름         |
| 자주 갱신되는 목록 (피드)     | `revalidate: 60` 또는 태그    | 신선도 + 비용 절충         |
| 유저별 실시간 (알림)          | `no-store`                    | 캐시되면 안 됨             |
| 검색 결과                     | `no-store` 또는 짧은 revalidate | 쿼리마다 달라짐          |

---

## 3. page0127 실제 코드 사례

### 현재 코드 — 캐시 옵션 없음

[app/api/books/search/route.ts:44](../apps/page0127/app/api/books/search/route.ts#L44)

```typescript
const response = await fetch(url);
// → 기본값: dynamic route(searchParams 사용)이므로 자동으로 no-store처럼 동작
```

이 라우트는 `request.nextUrl.searchParams`를 쓰기 때문에 Next가 **dynamic route**로 인식해서 매 요청마다 알라딘 API를 호출한다. **검색은 매번 다른 쿼리가 들어오니 맞는 동작**이지만, **인기 쿼리는 캐싱하면 알라딘 API 호출량을 줄일 수 있다**.

### 개선안 — 검색 결과 짧게 캐싱

```typescript
// 동일한 query+page 조합은 1시간 캐시
const response = await fetch(url, {
  next: { revalidate: 3600 },
});
```

### 개선안 — 도서 상세는 길게 캐싱

[app/api/books/detail/route.ts:41](../apps/page0127/app/api/books/detail/route.ts#L41)

```typescript
// 도서 상세 정보는 거의 안 바뀌므로 하루 캐시
const response = await fetch(url, {
  next: {
    revalidate: 86400, // 24시간
    tags: [`book-${isbn}`], // 특정 도서만 무효화 가능
  },
});
```

도서 정보(제목, 저자, 목차)는 한 번 발행되면 거의 변하지 않는다. 캐싱 효과가 가장 큰 영역.

### Client → Server Route → 외부 API 흐름

[src/shared/api/aladin.ts:33](../apps/page0127/src/shared/api/aladin.ts#L33)

```typescript
// Client Component에서 호출
const response = await fetch(url); // /api/books/search
```

- Client → Next API Route: 브라우저 `fetch`라서 `next` 옵션 없음
- Next API Route → 알라딘: 서버 `fetch`라서 `next` 옵션 적용 가능

→ **캐시 옵션은 서버 측 fetch(route.ts)에 붙여야 효과가 있다.**

---

## 4. 규칙

> **fetch에 캐시 의도를 명시하라.** 기본값에 의존하면 라우트가 dynamic이냐 static이냐에 따라 동작이 달라져 디버깅이 어렵다.

---

## 5. 오늘 실험

### 실험 1 — 도서 상세 캐싱 적용

[app/api/books/detail/route.ts:41](../apps/page0127/app/api/books/detail/route.ts#L41)에 `next: { revalidate: 86400, tags: ['book-detail'] }`을 추가하고, 같은 ISBN을 두 번 요청해 네트워크 탭에서 두 번째 요청이 빠른지 확인한다.

### 실험 2 — 검색 캐시 vs 신선도 비교

검색 API에 `revalidate: 60`을 적용 후, 같은 검색어를 1분 이내 / 1분 후에 호출해서 응답 시간을 비교한다. 알라딘 API 호출 로그(`console.log('알라딘 fetch')`)를 route.ts에 임시로 심어 캐시 적중 여부 확인.

---

## 6. 다음 Day 예고

**Day 45 — loading.tsx / Suspense**: 데이터 패칭 중 스켈레톤 UI 표시. 책장 로딩 스켈레톤 카드 구현.
