# Phase 6 · 보충 — 이미지 최적화 점검 (`next/image`)

> 스케줄 외 보충 문서. Day 66(번들 최적화) 실전 작업 중, "번들 다음은 이미지"라는 흐름에서 page0127의 이미지 처리를 **점검**한 기록.
> 핵심 교훈: **코드(grep)로 판단할 것 vs 실측(Lighthouse)으로 판단할 것을 구분한다.**

---

## 1. 오늘 점검한 코드

- [BookCardCover.tsx](../apps/page0127/src/features/book/ui/BookCardCover.tsx) — 책 표지 핵심 컴포넌트
- [next.config.ts](../apps/page0127/next.config.ts) — 외부 이미지 허용(`remotePatterns`)
- next/image 적용 13개 파일 (BookGridItem, BookListItem, UserCard, ReadingCalendar 등)

---

## 2. 핵심 개념

### (1) `next/image`가 자동으로 해주는 것

`<img>` 대신 `next/image`를 쓰면 **별도 설정 없이** 다음이 적용된다:

- **자동 리사이즈**: 디바이스 크기에 맞는 이미지만 생성·전송
- **포맷 변환**: 원본 JPG/PNG → **WebP/AVIF** 자동 변환 (용량 ↓)
- **lazy load**: 뷰포트 밖 이미지는 스크롤 시 로드 (기본값)
- **CLS 방지**: 크기를 미리 예약해 레이아웃 점프 차단

> 그래서 "`<img>` 생태그가 0개"라는 건 그 자체로 합격 신호다.

### (2) 주요 props — 언제 뭘 쓰나

| prop | 용도 | 주의 |
| --- | --- | --- |
| `fill` | 부모 크기에 꽉 채움 (크기 모를 때) | 부모에 `position: relative` 필요 |
| `width`/`height` | 크기를 아는 정적 이미지 | `fill`과 택일 |
| **`sizes`** | 반응형에서 **실제 표시 크기** 알려줌 | 없으면 과대 이미지 다운로드 |
| **`priority`** | **LCP 이미지**를 preload (lazy 해제) | 첫 화면 큰 이미지에만! |
| `placeholder="blur"` | 로딩 중 흐림 처리 | `blurDataURL` 또는 정적 import |

### (3) `priority`와 LCP — 가장 헷갈리는 부분

**LCP(Largest Contentful Paint)** = 첫 화면에서 가장 큰 요소가 그려지는 시점. 보통 **히어로 이미지나 목록 첫 줄 표지**가 LCP다.

```tsx
// ✅ 리스트의 첫 N개만 priority (첫 화면에 보이는 것)
{books.map((book, index) => (
  <BookCover key={book.id} priority={index < 4} />
))}

// ❌ 전체에 priority → 모든 이미지 즉시 로드 → LCP 오히려 악화 + 대역폭 낭비
```

> **함정**: "priority를 더 주면 빨라진다"가 아니다. lazy load를 해제하는 거라, **남발하면 역효과**다.

### (4) `remotePatterns` — 외부 이미지 허용

`next/image`는 보안상 **허용된 호스트의 이미지만** 최적화한다.

```typescript
// next.config.ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'image.aladin.co.kr' },     // 알라딘 표지
    { protocol: 'https', hostname: 'sjngwxtykqhlsvxcyqah.supabase.co' }, // 업로드 이미지
  ],
}
```

---

## 3. page0127 실제 점검 결과

### 적용 현황 (거의 만점)

| 항목 | 상태 |
| --- | --- |
| `<img>` 생태그 | **0개** (전부 `next/image`) |
| `next/image` 적용 | 13개 파일 |
| `sizes` | 10개 파일 |
| `placeholder`/blur | 10개 파일 |
| `fill` | 22곳 |
| `priority` | **2곳** (`PublicLibraryHeader`, `AvatarUpload`) |

### 모범 사례 — `BookCardCover`

```tsx
<Link href={`/books/${book.id}`} className='relative h-48 w-36 ...'>
  {book.cover_image ? (
    <Image
      src={book.cover_image}
      alt={book.title}
      fill                 // 부모(relative h-48 w-36) 크기에 맞춤
      className='object-cover'
      sizes='144px'        // w-36 = 144px → 딱 그만큼만 다운로드
    />
  ) : (
    <div>No Image</div>    // 표지 없을 때 fallback
  )}
</Link>
```

→ `fill` + 고정 `sizes='144px'` + fallback까지. 손댈 게 없다.

### 유일한 미묘 지점 — 책 목록 표지의 `priority`

`BookCardCover` / `BookGridItem` / `BookListItem` 모두 `priority` **0**.
- 책 목록 첫 줄 표지가 **LCP일 가능성**은 있다 → 첫 4~8개에 `priority` 주면 개선 여지
- **하지만** 그게 실제 LCP인지는 **코드로 알 수 없다.** 잘못 주면(전체 적용) 역효과.
- → **Lighthouse로 LCP 요소를 확인한 뒤** 판단할 일. 추측으로 건드리지 않는다.

---

## 4. 한 줄 규칙

> **이미지 적용 여부는 grep으로 판단(생태그 0 = 합격), `priority` 위치는 Lighthouse로 판단.** 측정 없이 priority를 남발하면 LCP가 더 나빠진다.

---

## 5. 오늘 실험 (2가지)

1. **WebP 변환·리사이즈 확인**: DevTools Network 탭 → 책 목록 열기 → 표지 이미지 요청을 보고 ① 포맷이 `webp`인지 ② 전송 크기가 144px 수준(원본보다 작은지) 확인. `next/image`가 실제로 변환·축소하는지 눈으로 검증.
2. **priority는 "측정 먼저"**: Lighthouse(또는 DevTools Performance)로 **LCP 요소가 무엇인지** 먼저 확인. 그게 책 목록 첫 줄 표지라면, 그때 첫 4개에 `priority={index < 4}`를 주고 LCP 수치를 전/후 비교. (측정 없이 코드부터 바꾸지 않기)

---

## 6. 스케줄 위치

- 이 문서는 **보충**(스케줄 외). Day 67은 이미 [최종 성능 점검](phase6_day67_최종성능점검.md)으로 완료됨.
- 스케줄상 다음은 **Day 68 — 전체 복습 & 회고** (Phase 1-6 마인드맵 + 개선 내역 정리).
- 오늘 한 번들·이미지 점검 내역은 Day 68 회고의 "개선 내역"에 포함하면 좋다.
