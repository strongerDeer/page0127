# 디자인 시스템 라운드 3 — `BookCover` 도메인 컴포넌트 설계

- 작성일: 2026-07-29
- 범위: 책 표지 셀을 `shared/ui` 컴포넌트로 추출하고 Figma 에 올린다 (교체 14곳)
- 선행: [라운드 2 묶음 2~4](2026-07-28-design-system-round2-batch234-design.md) — 컴포넌트 22개, 07 위반 0
- Figma 파일: `page0127` (`5ErSDsG1MNfvexSDZ2PfLS`)

---

## 0. 한 줄 요약

책 표지의 도메인 셰이프(비대칭 radius + 책등 그라데이션)가 **10개 파일에는 손으로 붙어 있고 6개 파일에는 없다.** 이를 `BookCover` 컴포넌트로 추출해 14개 파일을 흡수하고, 대체 조판을 하나로 통일한다.

---

## 1. 라운드 1의 전제가 하나 틀렸다

라운드 1 계획서는 라운드 3을 *"도메인 컴포넌트 — `BookCover`(비대칭 radius) · `BookCard`"* 로 적어뒀다. **`BookCard` 는 만들면 안 된다.**

### 1.1 `BookCard` 계열 4개는 죽은 코드다

| 파일 | 참조 | 최근 커밋 |
|---|---|---|
| `BookCard.tsx` | **0** | 2026-04-10 |
| `BookCardCover.tsx` | **0** | 2026-07-18 (스카이블루 리디자인) |
| `BookCardInfo.tsx` | **0** | **2026-07-28** (라운드 2 타이포 일괄 치환) |
| `BookCardSkeleton.tsx` | **0** | 2025-12-07 |

import 0 · JSX 0 · 배럴 재export 0 · **평문 문자열 검색 0**. 네 방식으로 확인했다.

죽었는데 **일괄 변경으로 연명 중**이다 — 라운드 2의 타이포 작업이 어제 `BookCardInfo` 를 건드렸다. 화면에 없는 코드를 계속 관리하고 있다는 뜻이다.

> **삭제하지 않는다.** [2026-06-24 교훈](../../CLAUDE.md) 대로 미사용 컴포넌트의 처분은 사용자 판단이다. 이 문서는 사실만 기록하고 §7 에 별건으로 넘긴다.

### 1.2 `BookCardCover` 는 정작 도메인 셰이프를 안 쓴다

이름이 `BookCardCover` 인데 `.book-cover` 클래스가 없다. 비대칭 radius 도 책등 그라데이션도 없이 `object-cover` 만 있다. **이름만 표지다.**

---

## 2. 진짜 문제 — 도메인 셰이프가 손으로 붙는다

`globals.css:163` 의 `.book-cover` 가 도메인 셰이프를 정의한다.

```css
.book-cover {
  border-radius: 2px 6px 6px 2px;   /* 왼쪽이 책등이라 각지고 오른쪽만 둥글다 */
  box-shadow: none;                 /* 그림자로 띄우지 않는다 */
  background-color: #fff;
  background-image: linear-gradient(to right,
    rgba(0,0,0,0.14) 0px, rgba(0,0,0,0.05) 3px, transparent 8px);  /* 책등 음영 */
}
```

이 클래스를 **10개 파일이 손으로 붙이고, 6개 파일은 안 붙인다.**

### 2.1 계열 1 — 셰이프가 붙은 10개 파일 (14곳)

`<Image width height className='book-cover h-XX w-auto shrink-0' />` 형태다. 크기는 곳마다 다르다: `h-16` `h-20` `h-24` `h-32` `h-40` `w-[120px]` `w-full` `aspect-[1/1.45]`.

**크기가 제각각인 것은 문제가 아니다** — 표지는 문맥마다 다른 크기로 놓인다. 문제는 셰이프와 대체 조판이 복붙된다는 것이다.

### 2.2 계열 2 — 셰이프가 없는 6개 파일, 그중 셋만 교체 대상

**표지를 렌더하지만 `.book-cover` 가 없는 6곳을 전부 열어봤다.** 셋은 의도된 다른 연출이라 건드리면 안 된다.

| 파일 | 현재 | 판정 |
|---|---|---|
| `BookGridItem.tsx:34` | `aspect-2/3 rounded-lg overflow-hidden bg-muted` | ✅ **교체** — 대칭 radius |
| `ReadingNowStrip.tsx:41` | `aspect-2/3 rounded-md bg-muted **shadow-sm**` | ✅ **교체** — 대칭 radius + **07 위반** |
| `BookDetailContent.tsx:46` | `h-80 w-56` (셰이프 없음) | ✅ **교체** |
| `BookFeedGrid.tsx:67` | `object-contain drop-shadow-md` + 안쪽 여백 | ❌ **제외** |
| `ReadingProgressOverview.tsx:188` | 표지 3장 부채꼴, `shadow-[0_18px_36px_…]` | ❌ **제외** |
| `PublicBookShelf.tsx:66` | 표지/**책등** 전환, CSS Modules | ❌ **제외** |

**제외 셋의 근거:**

- `BookFeedGrid` — 코드에 *"표지를 배경 위에 중간 크기로 띄운다 (꽉 채우지 않음)"* 라는 주석이 있다. 표지를 **면 위에 띄운 연출**이고 `object-contain` 이라 꽉 채우지도 않는다. `drop-shadow-md` 는 07 §2.3 의 *"실제로 떠 있는 것"* 에 해당한다.
- `ReadingProgressOverview` — 표지 3장을 부채꼴로 겹친 히어로 비주얼이다. 무거운 그림자와 흰 테두리가 **연출 그 자체**다.
- `PublicBookShelf` — 평점 5점만 표지를 세우고 나머지는 **책등(`spine_image`)** 을 꽂는 책장이다. 표지 셀이 아니다.

> **읽지 않았으면 셋 다 망가뜨릴 뻔했다.** "`.book-cover` 가 없다"는 정적 사실만으로 일괄 교체했다면 히어로·책장·띄운 표지가 전부 납작해졌다. **셰이프가 없는 것과 셰이프가 틀린 것은 다르다.**

### 2.3 대체 조판이 세 갈래로 갈렸다

표지가 없을 때 그리는 상자가 곳마다 다르다.

| 곳 | 클래스 | 내용 |
|---|---|---|
| `BookSearchResultCard` · `BookRankingList` | `bg-sunken p-1 text-[10px] text-text-faint` 가운데 | `표지 없음` |
| `ActivityCard` | `bg-sunken p-2 text-[10px] text-text-faint` 가운데 | 제목 10자 |
| `BookGridItem` | `bg-sunken px-2 py-2.5 text-[11px] font-bold text-text-strong` 위쪽 | 제목 + 저자 |
| `ReadingNowStrip` | `bg-sunken p-2 text-[10px] font-bold text-text-strong` 가운데 | 제목 |
| `BookDetailContent` | `bg-sunken text-sm text-text-faint` 가운데 | `표지 없음` |

크기·정렬·굵기·색·내용이 전부 조금씩 다르다.

---

## 3. 확정된 결정

| | 결정 | 근거 |
|---|---|---|
| `BookCard` | **만들지 않는다.** 삭제도 하지 않는다 | 죽은 코드를 Figma 에 박을 수 없다. 처분은 사용자 판단 |
| 대체 내용 | **항상 책 제목을 조판한다** | 이미 4곳이 이 방식이고 무슨 책인지 알 수 있다. `표지 없음` 리터럴 2곳이 바뀐다 |
| 계열 2 | **셋만 교체하고 도메인 셰이프로 통일** | 나머지 셋은 의도된 연출 (§2.2) |
| 크기 | **쓰는 쪽이 정한다** | 표지는 문맥마다 다른 크기로 놓인다. 강제하면 13곳이 다 깨진다 |

---

## 4. `BookCover` 설계

### 4.1 API

```tsx
type BookCoverProps = {
  /** 표지 이미지 URL. 없거나 빈 문자열이면 제목을 조판한다 */
  src?: string | null;
  /** 대체 조판에 쓰이고 img 의 alt 가 된다 */
  title: string;
  /** 부모가 크기를 정하는 비율 박스 안에 채울 때 (next/image 의 fill) */
  fill?: boolean;
  /** fill 이 아닐 때 next/image 에 넘길 고유 크기 */
  width?: number;
  height?: number;
  /** next/image 의 sizes */
  sizes?: string;
  /** 크기·위치는 쓰는 쪽이 정한다 */
  className?: string;

  // ── 구현하며 추가된 것 ──
  /** 주면 대체 조판이 두 줄이 된다 (제목 위, 저자 아래) */
  author?: string | null;
  /** 대체 조판의 기하가 이미지와 다를 때만 */
  fallbackClassName?: string;
  /** 장식용이라 스크린리더에서 감출 때 */
  decorative?: boolean;
  /** LCP 에 걸리는 큰 표지에만 */
  priority?: boolean;
};
```

**두 모드를 두는 이유.** 계열 1은 `width`/`height` 를 주고 `h-20 w-auto` 로 늘리는 고유 크기 방식이고, 계열 2는 `aspect-2/3` 박스 안을 `fill` 로 채우는 방식이다. **둘 다 실재하므로 하나로 강제할 수 없다.** `fill` 여부로 갈린다.

**구현하며 네 개를 더 붙였다.** 처음 설계에 없었지만 실제 호출부가 요구한 것들이다.

- `author` — 상세 페이지와 `BookGridItem` 의 대체 조판이 제목+저자 두 줄이었다. 클래스로는 해결되지 않는 **내용**이라 prop 이 필요했다.
- `fallbackClassName` — 상세 페이지는 이미지가 `h-auto`(원본 비율)인데 대체 상자에는 비율이 없어 `aspect-[1/1.45]` 를 따로 줘야 했다. `className` 에 넣으면 **이미지까지 그 비율로 크롭**된다.
- `decorative` — 제목이 옆에 이미 있는 목록에서는 표지를 `aria-hidden` 으로 감춘다. 기존 코드 다수가 `alt=''` 를 쓰고 있었다.
- `priority` — 상세 페이지 표지는 LCP 요소다. 안 넘기면 성능이 조용히 나빠진다.

> **인라인 style 과 `fallbackClassName` 은 함께 쓰지 않는다.** 대체 상자는 `width`/`height` 를 인라인 style 로 받아 크기를 잡는데, 인라인은 클래스를 이기므로 `fallbackClassName` 이 있으면 style 을 비워 호출부에 기하를 넘긴다.

### 4.2 렌더

```
src 있음  →  <Image … className='book-cover object-cover {className}' />
src 없음  →  <span className='book-cover flex … bg-sunken {className}'>
                <span className='line-clamp-4 …'>{title}</span>
             </span>
```

대체 조판은 **하나로 통일한다**: 가운데 정렬 · `text-[10px]` · `leading-snug` · `break-keep` · `line-clamp-4` · `text-text-faint`.

> 굵기는 **주지 않는다.** 지금 `font-bold` 인 곳이 3곳, 없는 곳이 2곳인데, 대체 표지는 진짜 표지의 자리를 메우는 것이지 강조 대상이 아니다. 07 의 weight 3단계(400/500/700)에서 **400** 이 맞다.

### 4.4 `bg-sunken` 은 지금까지 한 번도 적용된 적이 없었다

설계 초안은 대체 상자에 `bg-sunken`(회색 면)을 쓴다고 적었다. 기존 코드 5곳도 전부 그렇게 적혀 있었다. **그런데 실제로는 흰색으로 렌더돼 왔다.**

서빙되는 CSS 를 열어 확인한 결과:

| | 위치 | 레이어 |
|---|---|---|
| `.bg-sunken` | 2302행 | `@layer utilities` 안 |
| `.book-cover` | **4506행** | `@layer utilities` 는 4303행에서 닫힌다 → **레이어 밖** |

**레이어 밖 CSS 는 모든 레이어를 이긴다**(CSS Cascade Layers 명세). 따라서 `.book-cover` 의 `background-color: #fff` 가 `bg-sunken` 을 항상 덮었고, 대체 상자는 **흰 종이면 + 책등 음영** — 즉 "빈 책 표지" 로 보여 왔다.

**코드를 사실에 맞춘다.** 죽은 `bg-sunken` 을 걷어냈다. 화면은 그대로다(원래도 적용 안 됐으므로). Figma 의 `state=fallback` 도 흰 종이면 + 책등 음영으로 맞췄다 — 코드와 다른 것을 그려두면 안 된다.

> 같은 원리로 `DiscoveryCard` 의 `rounded-md` 도 죽은 클래스였다(§5). **레이어 밖 CSS 를 유틸로 덮으려는 시도는 전부 조용히 실패한다** — 이 프로젝트에서 `.book-cover` 를 쓰는 곳은 그 사실을 알고 써야 한다.

### 4.5 `.book-cover` 유틸은 그대로 둔다

컴포넌트가 클래스를 붙이는 방식이다. CSS 를 컴포넌트로 옮기지 않는 이유:

- 이 셰이프는 **Tailwind 로 표현할 수 없다**(비대칭 radius + 3단 그라데이션)
- 라운드 4에서 다크 값을 넣을 때 CSS 한 곳만 고치면 된다
- 제외한 셋(§2.2)이 나중에 셰이프를 원하면 클래스만 붙이면 된다

---

## 5. 교체 대상 14개 파일

**계열 1 (10개)** — `.book-cover` 를 손으로 붙이던 곳

`books/info/[id]/page.tsx` · `BookSavedCard` · `BookSearchResultCard` · `CompatibilityView` · `TasteAnalysisResult` · `ActivityCard` · `BookRankingList` · `ReadingCalendar` · `DiscoveryCard` · `TasteExampleCard`

**계열 2 (4개)** — 셰이프가 없던 곳

`BookGridItem` · `ReadingNowStrip` · `BookDetailContent` · **`BookRegistrationForm`**

> **`BookRegistrationForm` 은 조사에서 놓쳤다가 구현 중에 찾았다.** 이 파일만 `cover_image` 가 아니라 `highResCover`(= `upgradeImageResolution(book.cover)`) 라는 지역 변수를 써서, `cover_image` 로 훑은 조사 grep 에 걸리지 않았다. 검증 단계의 `표지 없음` 리터럴 검사가 잡아냈다 — **한 축으로만 세면 놓친다.**

**시각이 바뀌는 곳** (나머지는 동일):

| 파일 | 변화 |
|---|---|
| `BookGridItem` | 대칭 `rounded-lg` → 비대칭 도메인 셰이프 |
| `ReadingNowStrip` | 대칭 `rounded-md` → 비대칭 + **그림자 제거** |
| `BookDetailContent` | 셰이프 없음 → 비대칭 셰이프, 대체가 `표지 없음` → 제목 |
| `BookSearchResultCard` · `BookRankingList` | 대체가 `표지 없음` → 제목 |
| `ActivityCard` | 대체 제목이 `slice(0,10)` → `line-clamp-4` |

---

## 6. Figma

`Components` 페이지에 **`BookCover`** 를 만든다. 배치는 기존 노드 아래 빈 자리.

| variant | 내용 |
|---|---|
| `state=image` | 표지 이미지 자리표시자 + 도메인 셰이프 |
| `state=fallback` | `bg-sunken` + 제목 조판 |

- radius 는 **비대칭**(`2px 6px 6px 2px`) — Figma 는 모서리별 radius 를 지원한다
- 책등 그라데이션은 왼쪽 8px 폭 선형 그라데이션으로 근사한다. **Variable 에 바인딩할 수 없는 유일한 값**이라 그 사실을 description 에 적는다(검정 알파라 팔레트 색이 아니다)
- 그림자 **없음** — 07 §2.3 과 `.book-cover` 주석이 명시

예시 크기는 계열 1에서 가장 많이 쓰이는 `h-20`(80px) 기준 `56×80` 으로 만든다.

---

## 7. 하지 않는 것

- **`BookCard` 계열 4개 삭제** — 죽은 코드지만 처분은 사용자 판단이다(§1.1). 이 라운드는 사실만 기록한다.
- **`BookFeedGrid` · `ReadingProgressOverview` · `PublicBookShelf`** — 의도된 다른 연출(§2.2)
- **크기 토큰화** — 표지 크기는 문맥이 정한다. `h-16`~`h-40` 을 variant 로 묶을 근거가 없다
- **`spine_image`(책등) 처리** — `PublicBookShelf` 전용이고 표지와 다른 개념이다
- **라운드 4 다크모드** — `.book-cover` 의 `background-color: #fff` 와 그라데이션은 다크에서 재설계가 필요하다. 그때 함께 본다

---

## 8. 검증

### 8.1 교체 누락

```bash
cd apps/page0127
# BookCover.tsx 자신은 그 문자열을 갖는다 — 제외해야 0 이 된다
grep -rn "book-cover" --include="*.tsx" src app | grep -v "shared/ui/BookCover.tsx" | wc -l   # 0
grep -rn "표지 없음"  --include="*.tsx" src app | wc -l                                        # 1
```

**`grep -v` 로 컴포넌트 자신을 거르는 것이 핵심이다.** 거르지 않으면 이 값은 절대 0이 되지 않는다 — 클래스를 붙이는 주체가 그 파일이기 때문이다. 라운드 2에서 `button.tsx` 주석 때문에 `shadow-xs` 가 영원히 0이 안 됐던 것과 같은 구조다.

> **같은 함정을 구현 중에 또 밟았다.** `DiscoveryCard` 에 *"…`.book-cover` 가 레이어 밖이라…"* 라는 주석을 달았더니 그 주석이 grep 에 걸려 값이 1이 됐다. 주석에서 클래스 문자열을 빼고 "도메인 셰이프를 정의한 CSS" 로 바꿔 해결했다. **검증 대상 문자열은 주석에 쓰지 않는다.**

**`표지 없음` 은 1건이 남는다** — `BookCardCover.tsx:23`. §1.1 의 죽은 코드라 이번 범위가 아니다. 0을 기대하지 않는다.

최종적으로 `.book-cover` 클래스 문자열은 `BookCover.tsx` 와 `globals.css` **두 곳에만** 존재한다.

### 8.2 시각 실측 (Playwright)

| 대상 | 확인 |
|---|---|
| `.book-cover` 요소 | `borderRadius` 가 `2px 6px 6px 2px`, `boxShadow` 가 `none` |
| `ReadingNowStrip` 표지 | `boxShadow` 가 `none` (그림자 제거 확인) |
| 대체 상자 | `backgroundColor` 가 `--sunken`, `fontWeight` 가 `400` |

### 8.3 회귀

기존 테스트 전부 통과. `tsc --noEmit` 0.

### 8.4 Figma

컴포넌트에 `descriptionMarkdown` 이 있고 코드 경로를 포함한다. 페이지 전체 바인딩 누락 **0 유지**(현재 0), 노드 겹침 **0**.

> **그라데이션은 예외다.** 책등 음영은 검정 알파 3단이라 Variable 로 표현할 수 없다. 바인딩 검사에서 걸리면 예외로 인정하고 description 에 근거를 적는다 — 라운드 2의 `overlay` 때처럼 **양쪽에 만드는** 선택지가 없는 값이다.

---

## 9. 완료 기준

1. `BookCover` 가 `shared/ui` 에 있고 14개 파일이 그것을 쓴다
2. 앱 코드에 `book-cover` 클래스 문자열이 0건 — **`BookCover.tsx` 자신은 제외하고 센다**(§8.1)
3. `표지 없음` 리터럴이 **1건**(죽은 코드 `BookCardCover.tsx` 뿐) — 살아 있는 화면에는 0건
4. Figma `Components` 에 `BookCover`(variant 2)가 있고 description 에 코드 경로가 있다
5. 페이지 전체 바인딩 누락 0 (그라데이션 예외 명시)
6. 기존 테스트 통과, `tsc` 0
7. 제외한 셋과 `BookCard` 처분이 문서에 기록돼 있다

---

## 10. 참고

- 라운드 2: `2026-07-28-design-system-round2-batch234-design.md` — Figma MCP 함정, `descriptionMarkdown`, 겹침 검사
- 07 원칙: `00_docs/07_리디자인_진단_및_실행안.md` §2.3 그림자
- `.book-cover` 정의: `apps/page0127/app/globals.css:160-173`
