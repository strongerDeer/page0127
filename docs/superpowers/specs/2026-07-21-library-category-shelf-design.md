# "전체" 뷰 책장을 카테고리 섹션으로 분리

## 배경

`내 서재`(대시보드)와 `공개 서재`는 `LibraryView`를 공유하고, "전체"(누적) 뷰에서는 지금 모든 책을 카테고리 구분 없이 정렬 순서 그대로 한 줄로 나열한다. "진짜 서재처럼" 분야별로 책이 꽂혀 보이도록, 전체 뷰의 책장만 대분류(`mapToMainCategory`) 기준 섹션으로 나눈다.

## 범위

- 대상: `LibraryView`의 **"전체" 뷰**(`isAllView === true`)에서 렌더링되는 책장뿐. 연도별 뷰("2026년에 읽은 책" 등)는 지금처럼 그대로 둔다.
- 대상 화면: 내 서재(`/dashboard`), 공개 서재(`/[username]`) — 둘 다 `LibraryView`를 통해 렌더링되므로 한 번의 수정으로 양쪽에 반영된다.
- 대상 밖: 정렬 드롭다운, 검색/필터 로직, 카테고리 필터 UI(`CategoryFilter`) — 전부 `DashboardBookList`가 그대로 처리하며 이번 작업에서 건드리지 않는다.

### 관련 진행 중 작업 (참고)

같은 날 작성된 `2026-07-21-library-view-toggle-design.md`에 "책장형/피드형 토글" 스펙이 있으나 **아직 미구현** 상태다 (`BookFeedGrid` 컴포넌트, `viewMode` 상태 모두 코드에 없음). 그 스펙대로 구현되면 "책장형" 모드일 때만 기존 `renderBooks(filteredBooks)` 콜백이 호출되고, "피드형" 모드는 `DashboardBookList` 내부에서 별도로 분기되어 `renderBooks`를 거치지 않는다. 즉 이번 카테고리 섹션 분리는 **"책장형" 모드에만 적용되며 "피드형" 모드에는 자동으로 적용되지 않는다** — 피드형에도 카테고리 섹션이 필요한지는 그 토글 기능을 구현할 때 별도로 결정할 사안이라 이번 스코프에서는 다루지 않는다.

## 컴포넌트 설계: `CategoryBookShelf`

새 파일: `apps/page0127/src/widgets/book/ui/CategoryBookShelf.tsx`

- `PublicBookShelf`와 같은 위치(`widgets/book/ui`)에 둔다 — "책 목록을 어떻게 배치해서 보여줄지"를 결정하는 같은 계층의 컴포넌트이기 때문.
- `PublicBookShelf`는 수정하지 않는다. `PublicBookShelf.tsx:24-31` 주석대로 "렌더링만, 단일 책임"인 컴포넌트라 그룹핑 책임을 넣지 않고, 대신 `CategoryBookShelf`가 카테고리별로 나눈 뒤 각 그룹을 `PublicBookShelf`에 위임한다.

### Props

```ts
type CategoryBookShelfProps = {
  books: Book[]; // DashboardBookList가 필터링·정렬까지 마친 filteredBooks
  username?: string; // PublicBookShelf에 그대로 전달 (공개서재 링크용)
};
```

### 동작

1. `books`를 순서 그대로 순회하며 `mapToMainCategory(book.category)` 기준으로 `Map<카테고리, Book[]>`에 버킷을 채운다. 순회 순서를 유지하므로 `DashboardBookList`가 이미 적용한 정렬(최신순/별점순/제목순 등)이 각 섹션 내부에서도 그대로 유지된다 — 별도 정렬 로직 불필요.
2. 버킷을 "책 많은 순" 내림차순으로 정렬하되, `'기타'` 카테고리는 개수와 무관하게 항상 맨 뒤로 보낸다.
3. 각 섹션을 `<h4>카테고리명 N권</h4>` + `<PublicBookShelf books={categoryBooks} username={username} compact />`로 렌더링한다.

### 왜 `stats.categoryReading`을 재사용하지 않는가

`stats.categoryReading`(`LibraryView.tsx:140`)은 전체 뷰 기준으로 이미 집계된 `{ category, count }[]`라 재활용을 검토했지만, 검색어나 필터(별점/상태 등)가 걸리면 이 집계값과 실제로 화면에 보이는 책 수가 달라진다. 섹션 제목의 "N권"과 섹션 나열 순서가 어긋나는 걸 피하기 위해, `CategoryBookShelf`는 매번 넘어오는 `filteredBooks`를 직접 세어 그 자리에서 순서를 정한다.

## `LibraryView` 변경

`renderBooks` 콜백(`LibraryView.tsx:152-154`)에서 `isAllView`일 때만 `CategoryBookShelf`를 쓰도록 분기한다.

```tsx
renderBooks={(filteredBooks) =>
  isAllView ? (
    <CategoryBookShelf books={filteredBooks} username={username} />
  ) : (
    <PublicBookShelf books={filteredBooks} username={username} compact />
  )
}
```

## 데이터 흐름 요약

```
LibraryView (isAllView=true)
  └─ DashboardBookList
       └─ filteredBooks (검색/필터/정렬 적용 완료, 순서 확정)
            └─ renderBooks(filteredBooks)
                 └─ CategoryBookShelf
                      ├─ mapToMainCategory로 그룹핑 (순서 유지)
                      ├─ 섹션 정렬: 책 많은 순, '기타'는 항상 마지막
                      └─ 섹션별 <PublicBookShelf compact />
```

## 에러 처리 / 예외

- `books.length === 0`인 경우는 `CategoryBookShelf`가 신경 쓸 필요 없다 — `DashboardBookList.tsx:474`에서 `filteredBooks.length > 0`일 때만 `renderBooks`를 호출하므로, `CategoryBookShelf`는 항상 책이 1권 이상 있는 배열만 받는다.
- 카테고리 필터(`CategoryFilter`)로 특정 대분류만 선택한 상태라면 `CategoryBookShelf`는 자연히 그 카테고리 섹션 하나만 그린다 — 별도 분기 불필요.

## 테스트 계획

이 프로젝트에는 자동화된 테스트가 없으므로 수동 확인으로 진행한다.

1. `pnpm dev`로 로컬 서버 실행 후 `/dashboard` 접속, "전체" 탭 확인.
2. 여러 카테고리의 책이 섞여 있을 때 카테고리별 섹션으로 나뉘어 보이는지, 섹션 제목에 권수가 맞게 표시되는지 확인.
3. 책이 가장 많은 카테고리가 맨 위에 오는지, `'기타'`로 분류된 책이 있다면 항상 맨 아래에 오는지 확인.
4. 정렬 드롭다운을 "별점 높은순"/"제목순"으로 바꿔가며, 각 섹션 내부에서 그 기준대로 정렬되는지 확인.
5. 검색어나 카테고리 필터를 걸어 일부 카테고리만 남았을 때, 남은 카테고리만 섹션으로 나오고 순서가 실제 권수와 일치하는지 확인.
6. 연도 탭(예: "2026년")으로 전환했을 때 기존처럼 카테고리 구분 없이 한 줄로 나오는지(영향 없음) 확인.
7. 공개 서재(`/[username]`)에서도 동일하게 동작하는지 확인.
