# page0127 메인 배너 관리 — 설계 문서

- 작성일: 2026-07-23
- 대상 앱: `apps/page0127`
- 선행: admin 페이지 1차(접근통제·`assertAdmin`·`createAdminClient`)가 main에 병합됨

---

## 1. 목적

랜딩 상단 히어로 배너의 슬라이드가 지금은 코드 상수(`src/widgets/landing/model/heroSlides.ts`의 `HERO_SLIDES`)에 하드코딩돼 있어, 문구 한 줄 바꾸려 해도 개발자가 코드를 고치고 배포해야 한다. 이 슬라이드를 **DB 테이블로 옮겨 admin(`/admin/banners`)에서 직접 추가·수정·삭제·순서변경·켜기끄기** 할 수 있게 한다.

슬라이드는 **글자 + 배경/글자색만** 쓰며(책 표지는 기존처럼 DB에서 자동 조합), **이미지 업로드는 없다.**

---

## 2. 범위

### 포함
- `hero_slides` DB 테이블 + 마이그레이션(현재 4개 슬라이드 seed) + RLS
- 공개 랜딩(`HeroBannerSection`)이 DB에서 켜진 슬라이드를 순서대로 읽고, 비면 코드 상수로 폴백
- admin `/admin/banners`: 카드형 편집 목록, 드래그로 순서변경(놓는 즉시 저장), 켜기/끄기, 추가, 삭제
- CRUD·순서·토글 서버액션 (assertAdmin + createAdminClient)

### 제외 (후속/비목표)
- 이미지 업로드(합의대로 없음)
- 예약 게시(노출 시작/종료 일시), A/B 테스트, 슬라이드별 노출 통계
- 배너 외 영역(운영 모니터링·콘텐츠 품질·내부 지표는 각자 별도 스펙)

---

## 3. 데이터 모델 — `hero_slides`

현재 `HeroSlide` 타입(`{ id, eyebrow, lines:[string,string], sub, href, cta, bg, fg }`)을 컬럼으로 편다. 2줄 카피 `lines`는 `line1`/`line2` 두 컬럼으로 저장한다(단순·질의 용이).

```sql
CREATE TABLE hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow    text NOT NULL DEFAULT '',   -- 작은 라벨(기간·회차·분류)
  line1      text NOT NULL,              -- 2줄 메인 카피 1
  line2      text NOT NULL,              -- 2줄 메인 카피 2
  sub        text NOT NULL DEFAULT '',   -- 서브 카피
  href       text NOT NULL,              -- CTA 링크
  cta        text NOT NULL,              -- 버튼 문구
  bg         text NOT NULL,              -- 배경색 hex (예: #14294e)
  fg         text NOT NULL,              -- 글자색 hex
  sort_order int  NOT NULL DEFAULT 0,    -- 노출 순서(오름차순)
  is_active  boolean NOT NULL DEFAULT true, -- 켜짐/꺼짐
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hero_slides_active_order_idx
  ON hero_slides (is_active, sort_order);
```

- `id`는 uuid PK. 기존 슬라이드의 의미있는 문자열 id(`'shelf'` 등)는 버린다(사용자 승인). React key·애널리틱스는 uuid를 쓴다.
- **마이그레이션에서 현재 `HERO_SLIDES` 4개 값을 `sort_order` 0..3, `is_active=true`로 seed** → 배포해도 랜딩 모양이 동일하다.

### RLS — 배너는 admin 테이블과 달리 "공개 콘텐츠"

```sql
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

-- 공개 읽기: 누구나 '켜진' 슬라이드만 볼 수 있다 (랜딩이 anon 키로 읽으므로 필요)
CREATE POLICY "anyone can read active slides"
  ON hero_slides FOR SELECT
  USING (is_active = true);
```

- 쓰기(INSERT/UPDATE/DELETE) 정책은 두지 않는다 → 일반/anon 키로는 불가. admin은 `createAdminClient()`(service_role)로 RLS를 우회해 전부 관리한다.
- 공개 SELECT 정책이 `is_active=true`로 제한되므로, 랜딩이 raw 쿼리를 해도 꺼진 슬라이드는 노출되지 않는다(방어적).

---

## 4. 공개 랜딩 동작

- 새 공개 읽기 함수 `getActiveHeroSlides()` (`src/entities/banner/`):
  - `hero_slides`에서 `is_active=true`를 `sort_order` 오름차순으로 조회(일반 `createClient`).
  - DB 행 → `HeroSlide` 매핑(`lines: [line1, line2]`).
  - **결과가 0개면 코드의 `HERO_SLIDES` 상수를 반환**(폴백 — 랜딩이 절대 비지 않게).
- `HeroBannerSection`은 `HERO_SLIDES` 상수 대신 `await getActiveHeroSlides()`를 써서 `<HeroBanner slides=... covers=... />`로 넘긴다. 책 표지 조합 로직은 그대로.
- `HERO_SLIDES` 상수와 `HeroSlide` 타입은 **폴백·타입 정의로 코드에 남긴다**(삭제하지 않음).

---

## 5. admin 화면 — `/admin/banners`

- 라우트: `app/(admin)/admin/banners/page.tsx` (Server Component). `assertAdmin`은 상위 `(admin)/admin/layout.tsx`가 이미 처리. 페이지는 `createAdminClient()`로 **전체 슬라이드(꺼진 것 포함)를 `sort_order` 순**으로 로드해 client 관리 컴포넌트에 넘긴다.
- **`BannerManager` (`'use client'`)**: 슬라이드 카드 목록. 유일한 상호작용 컴포넌트.
  - **드래그로 순서 변경**(dnd-kit sortable). 놓는 순간 `reorderSlides(orderedIds)` 서버액션 호출 → `sort_order`를 인덱스대로 갱신(자동 저장).
  - 상단 **"새 슬라이드 추가"** 버튼 → `createSlide()`(빈/기본값 슬라이드 생성, 맨 끝 순서).
- **`SlideCard`**: 카드 하나. 필드 인라인 편집:
  - 텍스트 입력: eyebrow, line1, line2, sub, cta, href.
  - 색: `<input type="color">` 2개(bg/fg) — 라이브러리 없이 브라우저 기본 색선택기. 카드 배경/글자가 그 색으로 보여 **미니 미리보기** 역할.
  - **켜기/끄기 토글**, **삭제** 버튼.
  - 편집 저장 방식: 필드 blur 또는 "저장" 버튼으로 `updateSlide(id, fields)` 호출(구현 계획에서 확정 — 기본은 카드 단위 "저장" 버튼으로 명시적 저장).
- 디자인: 그림자 없음(1px `border-line`), 이모지 없음(필요 시 lucide 단색), 실제 프로젝트 토큰(`border-line`·`text-text-subtle` 등), 데이터 없으면 빈 상태 문구.

### 서버액션 (`src/features/admin-banners/api/slideActions.ts`, 모두 `assertAdmin` 먼저 + `createAdminClient`)
- `createSlide(): Promise<void>` — 기본값 슬라이드 1개 삽입(`sort_order` = 현재 최대+1, is_active=true).
- `updateSlide(id, fields): Promise<void>` — 텍스트·색 필드 갱신, `updated_at=now()`. 쓰기 에러 시 throw.
- `deleteSlide(id): Promise<void>`.
- `toggleActive(id, active): Promise<void>`.
- `reorderSlides(orderedIds: string[]): Promise<void>` — 배열 인덱스를 각 행의 `sort_order`로 저장.
- 각 액션 후 `revalidatePath('/admin/banners')` + `revalidatePath('/')`(랜딩 반영).

---

## 6. 파일 구조 (FSD)

```
supabase/migrations/<ts>_create_hero_slides.sql       # 테이블 + seed + RLS

src/entities/banner/
  ├─ types.ts            # HeroSlideRow(DB 행) 타입 + HeroSlide 매핑 유틸
  └─ getActiveHeroSlides.ts   # 공개 읽기(+상수 폴백)

src/features/admin-banners/
  ├─ api/getAllSlides.ts      # admin 전체 조회(createAdminClient)
  ├─ api/slideActions.ts      # create/update/delete/toggle/reorder ('use server')
  └─ ui/
      ├─ BannerManager.tsx    # 'use client' — dnd-kit sortable 목록 + 추가
      └─ SlideCard.tsx        # 카드 하나(인라인 편집·토글·삭제)

app/(admin)/admin/banners/page.tsx   # 서버, 전체 로드 → BannerManager

수정:
src/widgets/landing/ui/HeroBannerSection.tsx  # HERO_SLIDES → getActiveHeroSlides()
```

`HeroSlide` 타입·`HERO_SLIDES` 상수(`widgets/landing/model/heroSlides.ts`)는 폴백·타입으로 유지.

---

## 7. 의존성

- **dnd-kit** 추가(`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) — React 19 호환 드래그 정렬. (프로젝트에 드래그 라이브러리 없음 확인됨.)

---

## 8. 검증 관점 (하이브리드 — admin 1차와 동일 기준)

- 순수 로직(있다면): DB행→HeroSlide 매핑, 폴백 분기 → vitest.
- 서버액션·쿼리·UI: type-check + lint(앱 폴더 기준) + 개발서버 수동 확인.
- 수동 확인 시나리오: admin에서 슬라이드 추가→문구/색 수정→드래그 순서변경→끄기 시 랜딩에서 사라짐→전부 끄거나 지우면 랜딩이 코드 폴백으로 표시.
- 마이그레이션 적용은 사용자 수동 단계(admin 1차와 동일).

---

## 9. 열어둔 소소한 결정(구현 계획에서 확정)

- 카드 편집 저장: 카드 단위 "저장" 버튼(기본) vs 필드 blur 자동저장 → 기본은 명시적 "저장" 버튼.
- 카피 길이 가이드(2줄 8~12자 등)는 **강제하지 않고** 소프트 힌트(글자 수 표시)만 두거나 생략.
