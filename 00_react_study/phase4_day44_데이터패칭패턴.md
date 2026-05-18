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

## 3. page0127 전수 조사 결과

프로젝트 전체에서 데이터 패칭 패턴을 4가지로 분류했다.

| 분류 | 위치 | Next 캐시 적용 가능? |
|------|------|---------------------|
| ① 외부 API fetch (알라딘) | `app/api/books/search`, `detail`, `taste-analysis/analyze` | ✅ 효과 큼 |
| ② Server Component → Supabase | `app/(protected)/**/page.tsx` | △ `unstable_cache` 필요, 위험 |
| ③ Mutation route (POST/PATCH/DELETE) | 17개 라우트 | `revalidateTag` 호출 지점 |
| ④ Client fetch | `books/add/page.tsx` 등 | ❌ TanStack Query 영역 |

### 캐싱이 효과 큰 영역 = 공용 + 거의 안 변함

| 데이터 특성 | 캐싱 효과 | page0127 사례 |
|------------|---------|--------------|
| 공용 + 거의 안 변함 | 매우 큼 ⭐ | **알라딘 메타데이터** |
| 공용 + 자주 변함 | 중간 | 책 인기 랭킹 |
| 유저별 + 거의 안 변함 | 작음 | 유저 프로필 |
| 유저별 + 자주 변함 | 거의 없거나 손해 ❌ | 내 책 목록, 대시보드 |

→ **이번엔 ①만 적용. ②는 유저별 데이터라 캐시 키에 userId 박아야 하고, 무효화 누락 시 stale 버그 + 보안 위험.**

---

## 4. 이번에 적용한 변경

### ① [app/api/books/search/route.ts:43-46](../apps/page0127/app/api/books/search/route.ts#L43)

```typescript
// 같은 검색어+페이지 조합은 1시간 캐시 (알라딘 API 호출량 절감)
const response = await fetch(url, {
  next: { revalidate: 3600 },
});
```

### ② [app/api/books/detail/route.ts:40-43](../apps/page0127/app/api/books/detail/route.ts#L40)

```typescript
// 도서 상세 정보(제목, 저자, 목차)는 거의 변하지 않음 → 24시간 캐시
const response = await fetch(url, {
  next: { revalidate: 86400 },
});
```

### ③ [app/api/taste-analysis/analyze/route.ts:223-227](../apps/page0127/app/api/taste-analysis/analyze/route.ts#L223)

```typescript
// 같은 추천 키워드로 알라딘 검색 시 24시간 동안 캐시 재사용
const response = await fetch(url, {
  next: { revalidate: 86400 },
});
```

### `tags`를 안 붙인 이유

알라딘 데이터는 **우리가 못 바꾸는 외부 데이터**라 `revalidateTag`를 호출할 비즈니스 이벤트가 없다. 태그만 붙이고 무효화 호출이 없으면 의미 없는 코드. 시간 기반 `revalidate`만으로 충분.

→ 추후 **"책 정보 새로고침"** 버튼처럼 무효화 트리거가 생기면 그때 태그 추가.

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

## 5. 규칙

> **캐싱은 데이터 특성에 맞게.** "유저별 + 자주 변함" 데이터에 캐시 추가는 손해. 캐싱 win은 "공용 + 거의 안 변함" 영역(외부 API 메타데이터)에 있다.

---

## 6. 다른 안을 안 택한 이유

### B안 (revalidate + tags + revalidateTag 호출)을 안 택한 이유

알라딘 데이터는 우리가 못 바꾸는 외부 데이터 → `revalidateTag` 호출할 비즈니스 이벤트가 없음. 태그만 박아두면 무용한 코드.

### C안 (Supabase까지 unstable_cache)을 안 택한 이유

1. **유저별 데이터** → 캐시 키에 userId 박아야 함 → 적중률 ↓
2. **mutation 17곳에 `revalidateTag` 박아야 함** → 한 곳이라도 누락하면 "내 책 안 보임" stale 버그
3. **보안 위험** → 캐시 키 설계 실수 시 다른 유저 데이터 노출 (RLS 우회)
4. **TanStack Query와 이중 캐싱** → 동기화 부담 ↑

---

## 7. 동작 검증 방법

1. `dev server` 띄우고 `/books/search?query=토지` 두 번 호출 → 두 번째는 즉시 응답
2. 책 상세 페이지 두 번 진입 → 두 번째는 네트워크 탭에서 캐시 적중
3. 임시로 `console.log('알라딘 호출')`을 fetch 직전에 박으면 두 번째 요청에서 안 찍힘

---

## 8. 다음 Day 예고

**Day 45 — loading.tsx / Suspense**: 데이터 패칭 중 스켈레톤 UI 표시. 책장 로딩 스켈레톤 카드 구현.
