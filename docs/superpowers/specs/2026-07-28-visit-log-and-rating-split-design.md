# 방문 이력 적재(D-1) + 평점·인생책 분리(F)

작성일: 2026-07-28
브랜치: `track-d1-visits-rating` (베이스: 로컬 `main` = `037c32d`)

## 배경

외부 제품 리뷰를 6개 트랙으로 쪼갠 것 중 세 번째 라운드다. 트랙 A(`cca03be`)는 숫자가
틀리지 않게 했고, 트랙 B(`e759127`)는 기록 경험을 1분 의식으로 만들었다.

원래 계획은 트랙 D(활성화·재방문 계측)를 통째로 하는 것이었다. 착수 전 확인한 결과
**현재 실사용자는 0명이고 아직 개발 중**이다. 이 사실이 범위를 바꿨다.

### 왜 계측 대시보드를 지금 만들지 않는가

리뷰가 요구한 지표는 대부분 **이미 DB에 있는 데이터로 소급 계산된다.**

| 지표 | 계산에 필요한 것 | 소급 가능? |
| --- | --- | --- |
| 활성화(가입 24h 내 첫 책 + 한줄 생각) | `books.created_at`, `books.one_line_review` | 가능 |
| 최근 4주 완독 기록 주간 사용자 수 | `activities.activity_type = 'book_completed'` | 가능 |
| **W1 / W4 재방문율** | **없음** | **불가능** |

즉 활성화 지표는 6개월 뒤에 코드를 짜도 지난 6개월 치가 전부 나온다. 지금 만들면
화면에 `0/0`만 뜨고 검증도 못 한 채 실데이터를 맞게 된다.

**예외가 하나 있다.** `books`·`activities`에는 *행동한 사람*만 남는다. 로그인해서
둘러보고 아무것도 하지 않고 나간 사람은 흔적이 없다. `auth.users.last_sign_in_at`은
**최신 1건을 덮어쓰는 컬럼**이라 이력이 되지 못한다. 재방문율은 오늘부터 적재하지
않으면 영영 계산할 수 없다.

그래서 이번 라운드는 **소급 불가능한 것(D-1)만 심고**, 남는 예산으로 미뤄둔 스키마
부채(F)를 갚는다. 대시보드는 사용자가 생긴 뒤 별도 라운드로 만든다.

### GA·Vercel Analytics와의 역할 분담

앱에는 이미 GA4와 Vercel Web Analytics가 붙어 있다(`app/layout.tsx`). 둘 다
**페이지 조회수·체류시간을 익명으로** 수집한다. 못 하는 것은 **"누가"와 연결하는 것**
하나뿐이다. D-1은 그 빈칸만 채운다 — 페이지별 조회수나 체류시간을 다시 만들지 않는다.

---

## D-1. 방문 이력 적재

### 목표

로그인한 사용자가 서비스에 들어온 **날짜**를 남긴다. 재방문율 계산에 필요한 최소
데이터가 목표이며, 그 이상은 넣지 않는다.

### 무엇을 남기고 무엇을 남기지 않는가

남기는 것: `(user_id, 방문 날짜, 그날 첫 방문 시각)`

`first_visit_at`은 컬럼 하나 비용으로 **"몇 시에 오는 사람들인가"**를 알려준다. 트랙
C(주간 회상)가 알림·메일 발송 시각을 정할 때 쓸 근거이며, 이것도 지금 적지 않으면
되살릴 수 없는 종류다.

남기지 않는 것과 그 이유:

| 항목 | 이유 |
| --- | --- |
| 어느 페이지를 봤는지 | GA·Vercel이 이미 익명으로 수집 중. 사용자 id와 묶는 순간 **개인별 행동 기록**이 되어 개인정보처리방침에 없는 수집이 된다 |
| 체류 시간 | 같음 |
| 방문 횟수(하루 n회) | 재방문율은 "그날 왔는가"만 필요하다. 횟수는 어떤 판단도 바꾸지 않는다 |
| 비로그인 방문자 | 재방문율의 대상이 아니다. 익명 방문자 수는 GA가 담당한다 |

이 원칙은 `quality_rum_samples`의 설계 결정과 같은 선상에 있다. 그 테이블은 주석에
**"로그인 사용자 id는 붙이지 않는다(개인 성능 프로파일을 만들지 않는다)"**고 명시했다.
그래서 RUM 비콘에 user_id를 얹어 재활용하지 않고 **별도 테이블**을 만든다.

### 테이블

`supabase/migrations/20260728000002_create_user_daily_visits.sql`

```sql
create table public.user_daily_visits (
  user_id        uuid not null references auth.users(id) on delete cascade,
  visit_date     date not null,
  first_visit_at timestamptz not null default now(),
  primary key (user_id, visit_date)
);
```

- **복합 PK가 중복 방어의 최종 수단이다.** 클라이언트가 몇 번을 보내든 하루 1행이다.
- `on delete cascade` — 회원 탈퇴 시 방문 이력도 함께 지워진다. 계정 삭제 기능이
  이미 있으므로(`app/api/auth/account/route.ts`) 여기에 잔재가 남으면 안 된다.
- 저장량: 사용자 100명이 매일 와도 연 36,500행. 조회 패턴이 `user_id` 기준이라
  PK 인덱스로 충분하며 추가 인덱스를 만들지 않는다.

**권한**: RLS를 켜고 정책을 **하나도 만들지 않는다**(= 전면 거부). 쓰기는 `/api/visit`이
service_role로, 읽기는 나중에 만들 admin 코드가 `createAdminClient`로 한다.
`20260724000000_grant_public_privileges.sql`이 앞으로 생길 테이블에 anon/authenticated의
insert 권한까지 주므로, **정책을 안 만드는 것이 유일한 차단 수단**이다.
`quality_rum_samples`와 같은 방식이다.

### 날짜 기준 — KST

`visit_date`는 **Asia/Seoul 기준 날짜**로 계산한다. UTC로 자르면 한국 시각 밤 9시
이후의 방문이 다음 날로 밀린다. "매일 들어왔는데 하루 빠진 것처럼" 보이게 되어
연속 방문 판정이 틀어진다.

**저장소에 이미 관례가 있다.** `getCostSummary.ts`와 `aiUsage.ts`가 `KST_OFFSET_MS`
(9시간)를 더한 뒤 UTC getter를 쓰는 방식으로 KST 달력 날짜를 만든다. 한국은 서머타임이
없어 고정 오프셋이 항상 정확하다. **새 방식(`Intl`·`date-fns-tz`)을 들이지 않고 이
관례를 따른다.**

`src/shared/lib/date.ts`에 추가한다 (새 폴더를 만들지 않는다 — 이 파일은 이미 날짜
유틸을 모으는 자리이고, 주석에 "같은 일을 하는 구현이 세 곳에 흩어져 있었다 → 여기로
통일했다"는 이력이 적혀 있다):

```ts
export const toKstDateKey = (at: Date | string): string => ...  // 'YYYY-MM-DD'
```

서버와 클라이언트가 **같은 함수**를 쓴다. 클라이언트는 "오늘 이미 보냈는가" 판정에,
서버는 실제 저장값 결정에 쓴다. 브라우저 타임존이 무엇이든 +9로 고정하므로 해외
접속에서도 두 값이 어긋나지 않는다.

> `getCostSummary.ts`·`aiUsage.ts`에도 같은 상수·로직이 각자 있다. 통합할 후보지만
> 이번 트랙과 무관한 파일이므로 건드리지 않는다.

### 적재 경로

**`POST /api/visit`** — `app/api/visit/route.ts`

```
1. UA 봇 판정을 하지 않는다 — /api/rum과 다른 점이다. 저장 조건이 "로그인 세션이
   있을 것"이라 크롤러는 애초에 통과하지 못한다. 걸러야 할 대상은 봇이 아니라
   **로그인해서 도는 e2e 테스트**이고, 그건 클라이언트에서 막는다(아래)
2. getCurrentUser()로 세션에서 user_id를 읽는다
   → 없으면 204 (에러 아님. 로그아웃 직후 발사된 요청이 정상 경로다)
3. createAdminClient()로 upsert, ignoreDuplicates: true
4. 실패해도 204 — 수집 실패가 사용자 경험을 건드리면 안 된다 (console.error만)
```

**user_id를 본문으로 받지 않는 것이 핵심이다.** 브라우저가 "나 길동인데 방문했어요"라고
말하는 걸 믿으면 남의 이름으로 방문 기록을 심을 수 있다. 서버가 세션 쿠키를 보고
직접 판단한다.

응답을 항상 204로 두는 것도 `/api/rum`과 같은 이유다 — 비콘은 응답을 읽지 않고,
오류 내용을 돌려주면 검증 규칙만 알려주는 꼴이 된다.

**`VisitReporter`** — `src/shared/lib/visit/VisitReporter.tsx` (client)

```
- useCurrentUserContext()로 로그인 여부를 확인한다 → 비로그인이면 아무것도 안 한다
- navigator.webdriver 이면 중단 (Playwright e2e가 방문 기록을 오염시키지 않게)
- localStorage['visit-reported-date'] !== 오늘(KST) 일 때만 fetch
- 전송 성공 후에 localStorage를 갱신한다 (실패하면 다음 페이지 이동에서 재시도)
- localStorage 접근이 막혀 있어도(프라이빗 모드) 던지지 않는다 — try/catch로 감싸고
  그 경우엔 매번 보낸다. 서버 PK가 중복을 흡수하므로 데이터는 안전하다
```

**마운트 위치**: `app/layout.tsx`의 `<CurrentUserProvider>` **안**. `WebVitalsReporter`는
Provider 밖에 있지만 VisitReporter는 로그인 상태를 알아야 하므로 안쪽이어야 한다.

`sendBeacon`을 쓰지 않는다. RUM은 페이지가 사라지는 순간 지표가 확정되어 beacon이
필수였지만, 방문 기록은 **페이지 진입 시점에 이미 확정**되므로 일반 `fetch`로 충분하고,
전송 성공을 확인해야 localStorage를 갱신할 수 있다.

### 검증

vitest(`.test.ts`)로 순수 함수를 잠근다. UI·네트워크는 테스트하지 않는다.

`date.test.ts`에 `toKstDateKey` 케이스를 추가한다.

- UTC 2026-07-28 14:59Z → `2026-07-28` (KST 23:59)
- UTC 2026-07-28 15:00Z → `2026-07-29` (KST 00:00) ← **날짜 경계**
- 연말 경계: UTC 2026-12-31 15:00Z → `2027-01-01`

"오늘 이미 보냈는가" 판정은 `저장값 !== 오늘키` 한 줄이라 별도 함수로 뽑지 않는다.
감쌀 로직이 없는 것을 함수로 만들면 테스트가 문자열 비교를 검증하게 된다.

---

## F. 평점에서 인생책 분리

### 문제

`books.rating`은 `0, 1, 2, 3, 4, 5, 10`을 갖는데 **균일한 척도가 아니다.**

- `0` = "평가 안 함" (점수가 아님)
- `10` = "인생책" (11번째 점수가 아니라 최고점의 별칭)

숫자 칸에 숫자가 아닌 뜻을 끼워 넣은 상태다. 평균을 그대로 내면 인생책 하나가 10점으로
계산되어 왜곡된다.

트랙 A가 이 왜곡을 고쳤지만 **DB는 그대로 두고 코드 쪽에 규칙을 모으는 방식**이었다.
`src/entities/book/model/rating.ts`의 첫 주석이 그 의도를 밝히고 있다:

> 판정과 변환을 모두 이 파일로 모아, **나중에 컬럼을 분리할 때 고칠 자리가 한 곳이
> 되게 한다.**

이번에 그 "나중"을 실행한다.

### 왜 지금인가

데이터가 적을수록 데이터 변형 마이그레이션이 싸고 안전하다. 사용자 0명인 지금이
가장 싼 시점이며, 오픈 후에는 되돌리기 어려워진다.

### 마이그레이션

`supabase/migrations/20260728000003_split_life_book_from_rating.sql`

**순서가 중요하다.** CHECK 제약이 `10`을 허용하는 동안 백필해야 한다. 제약을 먼저
좁히면 백필이 자기 제약에 막힌다.

```sql
-- 1) 컬럼 추가 (기존 행은 전부 false)
alter table public.books
  add column if not exists is_life_book boolean not null default false;

-- 2) 백필 — 이 시점엔 CHECK가 아직 10을 허용한다
update public.books
   set rating = 5, is_life_book = true
 where rating = 10;

-- 3) 이제 제약을 좁힌다
alter table public.books drop constraint if exists books_rating_check;
alter table public.books
  add constraint books_rating_check check (rating in (0, 1, 2, 3, 4, 5));

-- 4) 랭킹 함수가 where 절로 쓰므로 부분 인덱스
create index if not exists books_is_life_book_idx
  on public.books (is_life_book) where is_life_book;
```

> 제약 이름은 baseline에서 인라인 `CHECK`로 만들어져 Postgres가 자동 명명한다
> (`books_rating_check`). 구현 시 **운영 DB에서 실제 이름을 먼저 확인**하고, 다르면
> 그 이름을 쓴다. 이름을 잘못 넣으면 `drop constraint if exists`가 조용히 통과해
> 옛 제약이 남는다.

**의미가 바뀌는 지점 하나**: 백필 후 `rating = 5`인 책은 "5점을 준 책"과 "인생책이라
5점이 된 책"이 섞인다. 두 부류는 `is_life_book`으로 구별되므로 정보 손실은 없다.

### DB 함수

`rating = 10`을 쓰는 함수가 세 파일에 있다. 최신 정의는
`20260726000000_ranking_functions_public_only.sql`이므로 **그 파일의 함수들을 이번
마이그레이션에서 재정의**한다(옛 파일들은 이미 덮어써진 상태라 건드리지 않는다).

- `get_books_of_life` — `WHERE b.rating = 10` → `WHERE b.is_life_book`
- 랭킹 스냅샷 생성 함수 — 같은 치환
- `rank_type_param = 'best'` 분기 — 같은 치환

`is_public = true` 조건은 그대로 유지한다. 트랙 A가 넣은 공개 범위 조건을 실수로
떨어뜨리면 비공개 책이 랭킹에 샌다.

### 앱 코드

**타입** (`src/entities/book/types.ts`)

```ts
export type BookRating = 0 | 1 | 2 | 3 | 4 | 5;   // 10 제거
// Book 타입에 isLifeBook: boolean 추가
```

**도메인 모델** (`src/entities/book/model/rating.ts`)

| 함수 | 변경 |
| --- | --- |
| `toScore` | **삭제**. 10이 사라지면 항등함수가 된다 |
| `isLifeBook(rating)` | **삭제**. 판정이 `flag === true`가 되면 술어 함수가 값을 더하지 않는다. 호출처가 `book.isLifeBook`을 직접 읽는다 |
| `isTopRated(rating)` | `isTopRated(rating, isLifeBook)` — 2인자. 두 값을 함께 봐야 하므로 함수로 남길 값이 있다 |
| `isRated` | 변경 없음 |
| `averageScore` / `summarizeRatings` | `.map(toScore)` 제거, 동작 동일 |

`isLifeBook`을 남기지 않는 이유를 한 번 더 적어 둔다. 남기면 select에서 컬럼을
빠뜨렸을 때 `isLifeBook(undefined)`가 조용히 `false`를 돌려준다. 그건 **없는 값을
"아니오"로 둔갑시키는 폴백**이고, 인생책 배지가 이유 없이 사라지는 버그가 된다.
직접 접근하면 최소한 눈으로 추적할 지점이 줄어든다.

**쓰기 경로**: 등록 폼은 지금 `[0,1,2,3,4,5,10]` 배열을 돌며 버튼을 그리고 `10`이면
'인생책' 라벨을 붙인다. **화면은 그대로 둔다** — 선택지 목록에서 `10` 대신 `'life'`
센티넬을 쓰고, 제출 시 `{ rating: 5, isLifeBook: true }`로 매핑한다. 트랙 B에서 막
만든 평가 UI를 사용자 0명 상태에서 다시 흔들 이유가 없다. 트랙 F는 스키마 부채
상환이지 UX 변경이 아니다.

> 폼의 `isLifeBook(score)` 호출은 **다른 성격**이다. DB 값이 아니라 *선택지 후보*를
> 판정한다. 여기는 함수가 아니라 `score === 'life'` 비교가 된다.

책 생성·수정 API 라우트가 `is_life_book`을 함께 저장하도록 고친다.

**읽기 경로**: 호출처는 **15개 파일 17곳**이다. UI만이 아니라 모델(`libraryPeriod.ts`)과
집계 API(`getOverallStats.ts`)도 포함된다.

- `isLifeBook` 14곳 — `BookCardInfo`, `DuplicateBookDialog`, `BookSavedCard`,
  `BookRegistrationForm`(위 예외), `RatingDoughnutChart`, `OverallDistribution`,
  `ActivityCard`, `ReadingCalendar`, `BookStreamEvent`, `BookDetailContent`,
  `LifeBooksShelf`, `MyBookMemo`, `libraryPeriod.ts`, `getOverallStats.ts`
- `isTopRated` 1곳 — `PublicBookShelf`
- `toScore` 2곳 — `api/compatibility/analyze`, `api/taste-analysis/analyze`
  (`isRated`로 0을 거른 뒤 `book.rating`을 그대로 쓰면 된다)

각 조회 쿼리의 select 목록에 `is_life_book`을 추가해야 한다.

> **함정 1 — select 누락을 타입이 못 잡는다.** Supabase 클라이언트에 `Database`
> 제네릭이 없어 select에 컬럼을 빠뜨려도 `tsc`가 통과한다(RLS 집계 불변식에서 이미
> 겪은 문제다). 인생책 배지가 조용히 사라지는 형태로 나타난다. 구현 시 위 17곳마다
> 데이터 출처의 select를 눈으로 확인한다.

> **함정 2 — 분포 차트는 단순 치환이 아니다.** `RatingDoughnutChart`와
> `OverallDistribution`은 **rating 값으로 그룹핑**해 "1점 n권 … 5점 n권, 인생책 n권"을
> 그린다. 지금은 인생책이 `rating = 10`이라 자연히 별도 항목으로 갈렸다. 백필 후에는
> **인생책도 `rating = 5`가 되어 5점 항목에 합쳐진다** — 치환만 하면 차트에서 인생책
> 항목이 사라지고 5점 막대가 갑자기 커진다. 그룹핑 키를 `rating` 단독에서
> `(rating, isLifeBook)` 조합으로 바꿔야 한다. **이 트랙에서 유일하게 로직이 바뀌는
> 지점이므로 구현 시 가장 먼저 확인한다.**

### 검증

- `rating.test.ts` 갱신 — `toScore`·`isLifeBook` 케이스 삭제, `isTopRated`를 2인자로
  다시 작성. `averageScore`는 10이 없어진 뒤에도 같은 값을 내는지 확인
- **분포 그룹핑에 테스트를 새로 붙인다.** 함정 2가 이 트랙에서 유일하게 로직이 바뀌는
  곳이므로, 그룹핑을 순수 함수로 뽑아 `(rating 5 + 인생책 아님)`과
  `(rating 5 + 인생책)`이 **다른 항목으로 갈리는지** 잠근다
- 마이그레이션은 `supabase db reset`(로컬 Docker)으로 clean 적용 확인
- 백필 검증: 적용 전 `select count(*) from books where rating = 10`을 기록하고,
  적용 후 `select count(*) from books where is_life_book`이 같은 수인지 대조
- 인생책 배지가 뜨는 화면과 분포 차트를 로컬에서 눈으로 확인 (자동 테스트로 못 잠그는 부분)

---

## 커밋 단위

리뷰 가능한 크기로 자른다. 각 단위는 **그 시점에 빌드가 통과**해야 한다.

| # | 내용 | 예상 규모 |
| --- | --- | --- |
| 1 | `user_daily_visits` 마이그레이션 | 작음 |
| 2 | `kstDate` + `shouldReport` 유틸 + vitest | 작음 |
| 3 | `POST /api/visit` 라우트 | 작음 |
| 4 | `VisitReporter` + layout 마운트 | 작음 |
| 5 | 평점 분리 마이그레이션 (컬럼·백필·CHECK·인덱스·DB 함수) | 중간 |
| 6 | 도메인 모델·타입 + 읽기 경로 일괄 치환 (17곳) | **큼** |
| 7 | 분포 그룹핑 수정 + 테스트 (함정 2) | 작음 |
| 8 | 쓰기 경로 (등록 폼 매핑 + 책 API) | 중간 |

**6번은 한 커밋에 15개 파일을 건드린다.** 쪼개면 중간 상태가 컴파일되지 않는다 —
`isLifeBook`을 지우는 순간 모든 호출처가 동시에 깨지기 때문이다. 대신 치환 자체는
단순하므로 리뷰는 **"select 목록에 `is_life_book`이 빠진 곳이 없는가"** 한 가지에
집중하면 된다.

7번을 6번에서 떼어낸 이유: 분포 그룹핑만 **기계적 치환이 아니라 판단이 들어가는
변경**이다. 큰 치환 커밋에 섞이면 안 읽힌 채 통과할 위험이 가장 큰 조각이므로
독립 커밋으로 분리해 눈에 띄게 둔다.

## 범위 밖

- **활성화·재방문 지표 화면** — 데이터가 쌓인 뒤 별도 라운드
- **비로그인 방문자 추적** — GA·Vercel Analytics가 담당
- **평가 UI 변경** — 별점과 인생책을 독립 입력으로 나누는 것은 제품 판단이 필요하며,
  사용자 0명 상태에서 실험할 근거가 없다
- **마이그레이션 버전 중복(`20260728000001` 2건)** — 이미 운영 적용된 것을 rename하면
  재적용이 시도되어 더 위험하다. 새 파일만 뒤 번호를 쓰고 기존은 두었다
