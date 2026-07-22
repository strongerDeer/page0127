# 내 서재 / 공개 서재 통합 — `/dashboard`, `/books/[id]`를 `/[username]`으로 흡수

## 배경

지금 서재 관련 화면은 라우트가 두 갈래로 나뉘어 있다.

- `/dashboard` (protected) — 소유자만 접근. 전체(공개+비공개) 책, 통계, 캘린더, 목표 설정, 취향분석 진입.
- `/[username]` (public) — 누구나 접근. `is_public=true`인 책만, 통계, 팔로우 버튼.
- `/books/[id]`, `/books/[id]/edit` (protected) — 소유자 전용 책 상세/수정.
- `/[username]/[bookId]` (public) — 방문자용 책 상세(읽기 전용).

각 쌍은 이미 상당 부분 컴포넌트를 공유한다 (`LibraryView`, `BookDetailContent`). 그런데도 라우트가 나뉘어 있어서 ①네비게이션 동선이 "내 서재"와 "공개 서재 보기"로 중복되고, ②`is_public=false`로 둘 이유(비공개 개념)가 약하며, ③"내 서재"라는 별도 개념이 "공개 서재의 소유자 모드"에 비해 존재 이유가 옅다는 문제가 있었다.

데이터 모델은 이미 책 단위 `is_public` 플래그(기본값 `true`)를 갖고 있고, 팔로우·피드·알림·궁합 기능이 이미 구현돼 있어 서비스 방향 자체가 "프로필(공개 서재) 중심 소셜 앱"으로 가고 있다. 이 스펙은 라우트를 하나로 합쳐 그 방향과 코드 구조를 일치시킨다.

## 목표 모델

- 서재는 사용자당 **하나**, `/[username]`.
- 본인이 자기 `/[username]`을 보면 **소유자 모드**(전체 책, 캘린더, 목표 설정, 취향분석 전체 진입, 보관 탭, 수정/삭제)가 얹힌다.
- 남이 보면 **방문자 모드**(공개된 책만, 읽기 전용, 팔로우 버튼)로 같은 화면이 렌더된다.
- 비공개(`is_public=false`)는 "숨김"이 아니라 인스타그램 보관함처럼 **"보관"** 으로 부른다 — 소유자만 보이는 별도 탭에 모인다.

## 범위

- 대상: `/dashboard`, `/[username]`, `/books/[id]`(+`/edit`), `/[username]/[bookId]`, `PATCH`/`DELETE /api/books/[id]`, `navItems.ts`, `middleware.ts`, `auth/callback/route.ts`.
- 대상 밖: 팔로우/피드/알림/궁합 기능 자체, `/books/all`·`/books/info/[id]`(전역 도서 카탈로그 — 별도 데이터 소스), username 변경 시 기존 링크 깨짐 문제(기존에도 있던 이슈), 색·타이포 등 비주얼 리디자인(`07_리디자인_진단_및_실행안.md`는 별도 트랙).

## 1. 라우트 구조

| 지금 | 바뀐 뒤 |
| --- | --- |
| `app/(protected)/dashboard/` | 삭제. 로그인 사용자의 `username`으로 `/[username]` 리다이렉트하는 얇은 라우트만 남긴다 (기존 북마크·링크 대응). |
| `app/(public)/[username]/page.tsx` | 유지 — 소유자/방문자 겸용으로 확장. |
| `app/(protected)/books/[id]/`, `.../edit/` | 삭제. 로그인 사용자가 소유한 책이면 `/[username]/[bookId]`(또는 `/edit`)로 리다이렉트하는 얇은 라우트만 남긴다. |
| `app/(public)/[username]/[bookId]/page.tsx` | 유지 — 소유자/방문자 겸용으로 확장. |

`apps/page0127/src/shared/config/supabase/middleware.ts`의 `PROTECTED_PREFIXES`에서 `/dashboard`를 제거한다. `/books`는 `/books/add`(등록 폼)가 여전히 로그인이 필요하므로 prefix 자체는 남기되, `PUBLIC_EXCEPTIONS`에 있는 `/books/all`·`/books/info`는 그대로 둔다. `/books/[id]`·`/books/[id]/edit`는 라우트가 사라지므로 이 목록과 무관해진다.

`apps/page0127/src/widgets/AppShell/model/navItems.ts`의 "내 서재" 항목 `href: '/dashboard'`를 로그인한 사용자의 `username`으로 바꾼다. `AppShell`이 이미 세션/프로필을 조회하는 지점이 있는지 확인하고, 없으면 프로필 조회를 한 번 추가한다. `isNavItemActive`의 `/dashboard` 특례 처리(하위 경로 비활성)는 `/[username]` 정확히 일치 여부로 옮긴다.

## 2. 데이터 흐름 & 권한

`/[username]/page.tsx`에서 계산하는 `isOwnProfile = currentUser?.id === profile.id`를 그대로 기준으로 쓴다.

```
isOwnProfile === true
  → books 전체(공개+보관), 캘린더 데이터, 취향분석 이력·재분석 게이트, 목표 정보까지 병렬 페치
  (지금 DashboardPage의 Promise.all 패턴을 그대로 옮긴다)
isOwnProfile === false
  → is_public=true인 books만, 취향분석은 최신 personality_type 하나만
  (캘린더·취향분석이력·재분석게이트 쿼리는 아예 실행하지 않는다)
```

`/[username]/[bookId]/page.tsx`도 동일하게 `isOwner = book.user_id === currentUser?.id`를 명시적으로 계산해 `BookDetailContent`의 `isOwner` prop과 수정/삭제 버튼 노출에 쓴다.

## 3. 컴포넌트 변경

### 서재 목록

- `LibraryView`(통계+책장 본문)는 이미 공유되므로 구조 변경 없음.
- `PublicLibraryContent`가 지금 `DashboardContent`의 역할(캘린더 슬롯, 목표 설정 다이얼로그, 취향분석 진입 버튼)을 `isOwnProfile` 조건부로 흡수한다.
- `DashboardContent`, `app/(protected)/dashboard/page.tsx`, `loading.tsx`는 삭제.
- `PublicLibraryHeader`는 이미 `isOwnProfile`로 팔로우 버튼 유무를 가르고 있으니, 그 자리에 "편집"·"보관 탭 진입" 같은 소유자 전용 액션을 추가한다.

### 책 상세

- `BookDetailContent`는 이미 `isOwner` prop으로 메모·공개여부 노출을 가르고 있어 그대로 재사용.
- `/books/[id]/page.tsx`에 있는 "목록으로 / 수정 / 삭제" 헤더 블록을 `/[username]/[bookId]/page.tsx`로 옮기고, 섹션 2의 `isOwner`로 감싼다.
- 뒤로 가기 링크는 항상 `/${username}`(공개 서재 목록)로 통일한다 — 지금 `/books/[id]`의 "← 목록으로"(`/books`)는 사라진다.

## 4. '보관' UI

- `ViewTabs`(전체/연도 탭) 옆에 **"보관"** 탭을 추가한다. `isOwnProfile`일 때만 렌더되고, 누르면 `is_public=false`인 책만 그리드로 보여준다. 방문자에게는 이 탭 자체가 없다(숨김이 아니라 미렌더).
- 새 토글 UI를 따로 만들지 않고 기존 `BookRegistrationForm`의 "공개 여부" 필드(등록/수정 공용)를 그대로 쓴다.
- 책 상세 페이지(`isOwner`)에 수정 폼까지 들어가지 않아도 되는 **"보관하기" / "보관 해제"** 퀵 액션 버튼을 추가한다 — `PATCH /api/books/[id]`에 `{ is_public: false }` / `{ is_public: true }`만 보낸다.
- 등록 폼의 "공개 설정" 체크박스(`BookRegistrationForm.tsx:439-449`) 문구 옆에 도움말 텍스트를 추가한다: "나중에 서재에서 보관으로 옮길 수 있어요." (기본값 `true`는 유지)

## 5. 보안 버그 수정 — 소유자 검증 누락

설계 중 발견한 기존 버그. `PATCH`/`DELETE /api/books/[id]` (`apps/page0127/app/api/books/[id]/route.ts`)가 `id`로만 조회·수정·삭제하고 `user_id` 검증이 없다 — 로그인만 되어 있으면 다른 사용자의 책을 수정/삭제할 수 있는 구조다. 이번에 추가하는 "보관하기" 액션도 같은 엔드포인트를 타므로 이번 스펙에서 함께 고친다.

- `PATCH`: `getCurrentUser()`로 얻은 `user.id`를 `.eq('user_id', user.id)` 조건에 추가. 대상 row가 없으면(소유자가 아니거나 미존재) 403/404 응답.
- `DELETE`: 동일하게 `.eq('user_id', user.id)` 추가.
- `GET`은 방문자도 호출해야 하므로(공개 책 조회) 소유자 제한을 걸지 않는다 — 대신 이 엔드포인트가 실제로 어디서 쓰이는지 확인해, 페이지 서버 컴포넌트가 아니라 클라이언트에서 직접 호출하는 경로가 있다면 `is_public=true OR user_id=현재유저`로 조건을 좁힌다 (구현 단계에서 실사용처 확인 필요).

## 6. 에러 처리 & 엣지 케이스

- **최초 로그인**: `app/auth/callback/route.ts`가 `/dashboard`로 리다이렉트하던 것을 프로필(및 username) upsert 후 `/${username}`으로 변경한다.
- **보관된 책 직접 URL 접근**: 방문자가 보관된 책의 `bookId`를 알고 직접 접근해도 `is_public=true` 조건부 쿼리라 지금처럼 404 — 변경 없음.
- **비로그인 사용자가 `/[username]` 접속**: 미들웨어 변경 불필요 — `isOwnProfile`이 자연히 `false`가 되어 방문자 모드로 렌더된다.
- **본인이 아직 username 없이 첫 로그인**: `getProfile`의 `ensureProfile` 패턴(프로필 없으면 upsert 후 재조회)을 콜백 단계로 옮겨, `/[username]` 도달 전에 username이 항상 존재하도록 보장한다.

## 검증 방법

- 로그인 후 "내 서재" 메뉴 클릭 → 본인 `/[username]`으로 이동, 캘린더·목표설정·취향분석·보관 탭이 보이는지 확인.
- 로그아웃 상태(또는 다른 계정)로 같은 `/[username]` 접속 → 캘린더·보관 탭·수정 버튼이 전부 없고 팔로우 버튼만 보이는지 확인.
- 책 상세에서 "보관하기" 클릭 → 보관 탭에는 뜨고 전체/공개 탭·방문자 화면에는 안 뜨는지 확인.
- 다른 사용자 소유의 `bookId`로 `PATCH /api/books/[id]` 직접 호출(예: curl) → 403/404 응답 확인.
- `/dashboard`, `/books/123` 기존 링크 접속 → 본인 `/[username]`(또는 소유한 책이면 `/[username]/123`)로 리다이렉트되는지 확인.
