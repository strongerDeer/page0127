# 내 서재 / 공개 서재: 정렬 기준 수정 + 책장형·피드형 뷰 토글

## 배경

`내 서재`(대시보드)와 `공개 서재`는 `LibraryView` → `DashboardBookList`를 공유한다.

1. **버그**: 정렬 드롭다운의 "최신순"이 `created_at`(책 레코드를 앱에 등록한 시각) 기준으로 정렬된다. 서버에서 최초로 받아오는 목록은 `completed_date`(완독일) 내림차순인데, 클라이언트가 다시 `created_at` 기준으로 재정렬하면서 두 기준이 어긋난다. 사용자는 "최근에 다 읽은 책이 맨 위"를 기대하므로, 정렬 기준을 `completed_date`로 통일한다.
2. **신규 기능**: 지금은 책 목록이 물리적 책장(책등/표지, `PublicBookShelf`) 형태로만 보인다. 여기에 "피드형" 보기를 추가해, 표지 카드 그리드 + "BOOK #번호" 뱃지로도 볼 수 있게 한다.

## 범위

- 대상 화면: 내 서재(`/dashboard`), 공개 서재(`/[username]`) — 둘 다 `LibraryView`를 통해 `DashboardBookList`를 쓰므로 한 번의 수정으로 양쪽에 반영된다.
- 대상 밖: `/books/all`(전체 도서 카탈로그, `global_books` 테이블 기반 — 별도 데이터 소스라 이번 스코프에 포함하지 않음), `/feed`(소셜 활동 피드 — 이름은 비슷하지만 이번 기능과 무관한 기존 라우트).

## 1. 정렬 기준 수정

`apps/page0127/src/features/stats/ui/DashboardBookList.tsx`의 정렬 비교 함수를 수정한다.

- 비교 필드를 `a.created_at` / `b.created_at` → `a.completed_date ?? a.created_at` / `b.completed_date ?? b.created_at`로 변경한다. (`completed_date`가 없는 예외 케이스만 `created_at`으로 대체)
- 정렬 비교 로직(오름차순/내림차순 계산) 자체는 이미 올바르므로 건드리지 않는다.
- `<SelectItem>`의 라벨("최신순"/"오래된순")과 `sortOption` 값(`created_at-desc`/`created_at-asc`)은 그대로 둔다 — 값 이름을 바꾸면 기존에 localStorage에 저장된 사용자 설정과 어긋날 수 있어, 필드 매핑만 바꾸는 쪽이 더 안전하다.

## 2. 책장형/피드형 토글

### 상태 관리

- `DashboardBookList.tsx` 내부에 `useLocalStorage<'shelf' | 'feed'>('library-view-mode', 'shelf')` 상태를 추가한다.
- 내 서재와 공개 서재가 같은 컴포넌트를 공유하므로, 토글은 브라우저(사용자) 단위로 공통 적용된다.

### UI

- 기존 툴바(검색·필터·정렬 버튼이 있는 줄)에 아이콘 버튼 2개를 추가한다: 책장형(`Library` 아이콘) / 피드형(`LayoutGrid` 아이콘).
- 현재 선택된 모드는 `variant='secondary'`(또는 유사한 강조 스타일)로 표시해 어떤 모드인지 시각적으로 구분한다.

### 렌더링 분기

- `viewMode === 'shelf'`: 기존과 동일하게 `renderBooks(filteredBooks)` 호출 → `PublicBookShelf` 렌더링 (변경 없음).
- `viewMode === 'feed'`: 새 컴포넌트 `BookFeedGrid`를 `DashboardBookList` 내부에서 직접 import해 렌더링한다. (별도 render prop을 추가하지 않는다 — 호출부가 `LibraryView` 하나뿐이라 prop으로 분리할 이유가 없다.)
- 두 모드 모두 페이지네이션 없이 필터링된 전체 목록을 한 번에 그린다 (지금 책장형 동작과 동일).

## 3. `BookFeedGrid` 컴포넌트

새 파일: `apps/page0127/src/widgets/book/ui/BookFeedGrid.tsx`

- `PublicBookShelf`와 같은 위치(`widgets/book/ui`)에 둔다 — 같은 계층의 "책 목록 렌더러"이기 때문.
- Props: `books: Book[]`, `bookHref?: (book: Book) => string`, `username?: string`, `rankMap: Map<string, number>`
- 2~3열 반응형 그리드(`grid-cols-2 sm:grid-cols-3`), 각 카드는 `BookGridItem`과 비슷한 표지 이미지 + 제목이되, 표지 좌상단에 `BOOK #{번호}` 뱃지를 얹는다.
  - 번호 포맷: `String(rank).padStart(3, '0')` → `BOOK #004`
  - `rankMap`에 없는 책(이론상 없어야 하지만 방어적으로)은 뱃지를 생략한다.
- 표지 없는 책은 `BookGridItem`처럼 제목을 조판한 플레이스홀더를 쓴다.

### 번호(rank) 계산 위치

- `DashboardBookList.tsx`에서 계산한다. **원본 `books` prop 전체**(카테고리/별점/검색 필터 적용 전, 상태 필터도 적용 전 — `LibraryView`가 서버에서 받아온 그대로)를 `completed_date`(없으면 `created_at`) 오름차순으로 정렬해 `Map<book.id, rank>`를 만든다 (1부터 시작, 가장 먼저 완독한 책이 1번).
- 이렇게 하면:
  - 검색어나 카테고리 필터를 걸어도 특정 책의 번호는 바뀌지 않는다.
  - 연도 탭을 바꾸면 서버가 이미 그 해 완독한 책만 `books`로 내려주므로, 번호가 자동으로 그 해 기준 1번부터 다시 매겨진다.
- `filteredBooks`(화면에 실제로 보이는, 필터 적용된 목록)를 그릴 때 각 책의 `id`로 `rankMap`을 조회해 번호를 붙인다.

## 데이터 흐름 요약

```
dashboard/page.tsx (서버)
  └─ books: completed_date desc로 정렬된 원본 배열
       └─ LibraryView → DashboardBookList
            ├─ rankMap = books를 completed_date asc로 재정렬해 계산 (1회, 필터 무관)
            ├─ filteredBooks = books에 검색/카테고리/별점/정렬 적용
            └─ viewMode
                 ├─ 'shelf' → PublicBookShelf(filteredBooks)
                 └─ 'feed'  → BookFeedGrid(filteredBooks, rankMap)
```

## 에러 처리 / 예외

- `completed_date`가 `null`인 완독 책(이론상 드묾): 정렬·랭킹 계산 모두 `created_at`으로 대체(fallback)한다.
- 책이 0권일 때: 기존 `PublicBookShelf`의 빈 상태 메시지와 동일한 패턴을 `BookFeedGrid`에도 적용한다.

## 테스트 계획

이 프로젝트에는 자동화된 테스트가 없으므로 수동 확인으로 진행한다.

1. `pnpm dev`로 로컬 서버 실행 후 `/dashboard` 접속.
2. 정렬 드롭다운을 "최신순"으로 두고, 실제로 가장 최근에 완독한(완독일 기준) 책이 맨 앞에 오는지 확인.
3. "오래된순"으로 바꿔 반대로 확인.
4. 책장형 ↔ 피드형 토글이 정상 전환되고, 새로고침해도 마지막 선택이 유지되는지(localStorage) 확인.
5. 피드형에서 번호가 1번부터 순서대로 매겨지는지, 검색/카테고리 필터를 걸어도 번호가 그대로인지 확인.
6. 연도 탭을 바꿔 그 해 기준으로 번호가 1번부터 다시 매겨지는지 확인.
7. 공개 서재(`/[username]`)에서도 동일하게 동작하는지 확인.
