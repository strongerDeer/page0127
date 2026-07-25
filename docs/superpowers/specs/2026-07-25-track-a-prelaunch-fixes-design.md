# 트랙 A — 오픈 전 데이터 정합성 수정

작성일: 2026-07-25
브랜치: `worktree-track-a-prelaunch-fixes`

## 배경

외부 제품 리뷰에서 page0127을 "소규모 공개 베타는 가능하지만 정식 오픈 단계는 아니다"로 평가했다.
리뷰는 6개 영역의 개선을 제안했고, 이는 서로 독립적인 6개 트랙으로 분해된다.

| 트랙 | 내용 | 이번 범위 |
| --- | --- | --- |
| A | 오픈 전 데이터 정합성 | **이 문서** |
| B | 60초 완독 기록 + 첫 보상 | 제외 |
| C | 재방문 구조 (주간 회상) | 제외 |
| D | 활성화·재방문 계측 | 제외 |
| E | 공유 자산 (동적 OG, 기록 카드) | 제외 |
| F | 평점 체계 DB 분리 (10점 → 5점 + `is_life_book`) | 제외 |

트랙 A만 이번 라운드에서 처리한다. 이유: 방문자가 보는 숫자와 목록이 틀린 상태로
트랙 B(기록 경험 재설계)를 쌓으면 잘못된 기반 위에 작업하게 된다.

## 목표

소규모 베타를 시작해도 **방문자가 보는 숫자와 목록이 틀리지 않게** 만든다.
제품 방향·기능 추가·디자인 변경은 하지 않는다.

## 검증된 결함 목록

리뷰가 지적한 5건은 모두 사실로 확인됐고, 리뷰가 놓친 3건을 추가로 발견했다.

### 리뷰 지적 사항 (확인됨)

1. 취향 분석 진입 장벽 5권 + 재분석 5권 — `PublicLibraryHeader.tsx`
   → **트랙 B의 "첫 보상" 문제. 이번 범위 아님** (버그가 아니라 제품 결정)
2. 등록 폼 평점이 `0, 1, 2, 3, 4, 5, 10` 으로 노출 — `BookRegistrationForm.tsx`
3. 공개 책 페이지가 10점을 그대로 평균에 포함 — `app/(public)/books/info/[id]/page.tsx`
4. 취향 재분석 조건의 타입 불일치 — `app/(public)/[username]/page.tsx`
   `completed_date`(date)와 `taste_analyses.created_at`(timestamptz)을 직접 비교
5. `ReaderProfiles`가 존재하지 않는 컬럼 `profiles.avatar_url` 조회 — 실제 컬럼은 `photo_url`

### 추가 발견 (리뷰 미포착)

6. **`0`은 "평가 안 함"인데 평균에 포함된다.**
   `RatingDistributionChart.tsx`가 `rating === 0`에 "← 평가 안 함" 라벨을 붙이는 것으로 확인.
   그런데 평균 계산은 `not('rating','is',null)`로만 걸러서 0점이 평균을 아래로 끌어내린다.
7. **공개 책 페이지 통계에 `is_public` 필터가 없다.**
   `app/(public)/books/info/[id]/page.tsx`의 인라인 `getBookStats`가 완독 수·평점을
   `is_public` 없이 집계한다. RLS는 익명 방문자만 걸러주므로, **로그인 사용자에게는 자기
   비공개 기록까지 섞여** 방문자와 다른 숫자가 보인다. `ReaderProfiles`와 같은 부류의 결함.
8. **`RatingDistributionChart`는 죽은 코드이고, 그 안에 "6.4 / 5.0" 버그가 있다.**
   자체적으로 `rating * count`의 가중합을 구해 `/ 5.0`으로 표기하는데, 가중합에 10점이
   포함되므로 산술적으로 5.0을 넘길 수 있다.

   단, **이 컴포넌트는 어디에서도 import되지 않는다** (앱 전체에서 식별자가 자기 정의
   1곳에만 등장). 즉 이 버그는 코드에 실재하지만 사용자에게 렌더된 적이 없다.
   같은 자리에 실제로 렌더되는 것은 `features/stats/ui/OverallDistribution.tsx`와
   `features/stats/ui/RatingDoughnutChart.tsx`이며, 둘 다 `LibraryView`가 쓴다.
   → **고치지 않고 파일을 삭제한다.** 살아 있는 평균 표시는 결함 6이 고쳐지면
   `calculateBookStats`를 통해 함께 바로잡힌다.

### 리뷰 제안 중 채택하지 않은 것

- **"분석에 포함된 book ID를 저장"** (결함 4의 해법으로 제안됨)
  → 불필요하다. `taste_analyses.analyzed_books_count` 컬럼이 이미 존재하므로
  마이그레이션 없이 뺄셈으로 해결된다.
- **"10점 데이터를 5점 + 인생책 boolean으로 마이그레이션"**
  → 1파일 수정이 아니다. `rating === 10`이 인생책 정의로 코드 6곳과 **DB 함수 2개**
  (`get_books_of_life`, `ranking_snapshots`)에 박혀 있다. 데이터 마이그레이션까지
  포함하면 별도 트랙(F) 규모다. 이번에는 표시 의미만 바로잡는다.

## 설계

### A-1. 평점 정규화

**결정: 정규화 방식** — 평균 계산에서 `0`은 제외하고 `10`은 `5`로 접는다.
`10`은 이미 "상한가 = 최고점"의 의미이므로 5로 접어도 의미가 보존된다.
대안(10점 기록을 평균에서 통째로 제외)은 최고 호평을 준 사람이 평균에서 무시되어
책이 오히려 낮게 보이는 역전이 가능해 채택하지 않았다.

평점 의미를 한 파일에 모은다. 새 파일 `apps/page0127/src/entities/book/model/rating.ts`:

| export | 동작 |
| --- | --- |
| `RATING_MAX = 5` | 만점 표기용 상수 |
| `isRated(rating)` | `null`과 `0` 제외 (`0` = "평가 안 함") |
| `toScore(rating)` | `10` → `5`, 나머지는 그대로 |
| `isLifeBook(rating)` | `rating === 10` |
| `isTopRated(rating)` | 최고 평가(5점 또는 인생책) — 책장 표지 뷰 판정용 |
| `averageScore(ratings)` | `isRated` 필터 → `toScore` 평균 → 소수 1자리. 대상 없으면 `0` |

**packages화 검토 (CLAUDE.md #5):** 앱이 `page0127` 하나뿐이고 이 규칙은 page0127의
도메인 규칙이다. `packages/`(design-tokens, icons, quality)로 뺄 근거가 없으므로
FSD 규칙대로 `entities/book/model`에 둔다.

**평균 계산 지점 교체:**

| 파일 | 변경 |
| --- | --- |
| `src/entities/book/model/libraryPeriod.ts` | `calculateBookStats`의 `ratingSum` 직접 합산 → `averageScore` |
| `app/(public)/books/info/[id]/page.tsx` | 인라인 `getBookStats`의 `reduce` → `averageScore` |
| `src/widgets/dashboard/RatingDistributionChart.tsx` | 죽은 코드 — **파일 삭제** (결함 8) |

`calculateBookStats.averageRating`을 고치면 이를 소비하는 살아 있는 표시가
함께 바로잡힌다: `RatingDoughnutChart`(평균 큰 숫자), `ReadingProgressOverview`
(요약 줄), 둘 다 `LibraryView` 경유.

**`rating === 10` 산재 지점을 `rating.ts` 헬퍼로 교체** (동작 동일, 의미 명시화):

- `src/widgets/book/ui/LifeBooksShelf.tsx` → `isLifeBook`
- `src/widgets/book/ui/PublicBookShelf.tsx` → `isTopRated`
  (표지 뷰 판정 `rating === 5 || rating === 10`이 "만점 = 5점 또는 인생책"과 같다)
- `src/features/stats/ui/OverallDistribution.tsx` → `isLifeBook` (`ratingLabel`)
- `src/entities/book/api/getOverallStats.ts` → `isLifeBook` (`perfectScoreBooks`)

이렇게 모으면 트랙 F에서 컬럼을 나눌 때 고칠 지점이 `rating.ts` 한 곳으로 수렴한다.

**DB 함수는 건드리지 않는다.** `get_books_of_life`와 `ranking_snapshots`의
`rating = 10` 조건은 그대로 둔다 (트랙 F 범위).

**표기:** 공개 책 페이지 평균 옆에 `/ 5`를 붙인다.

`OverallDistribution`의 `ratingLabel`은 10점을 "만점"으로 부르는데, A-5에서 등록 폼을
"인생책"으로 바꾸므로 같은 이름으로 맞춘다("만점" → "인생책").

`RatingDoughnutChart`는 평균을 만점 표기 없이 큰 숫자로만 보여준다. 같은 모호함이
있지만 이는 서재 화면의 카피·디자인 결정이라 이번 범위에서 제외한다 — 값 자체는
정규화로 정확해진다.

### A-2. 공개 책 페이지 `is_public` 필터

`app/(public)/books/info/[id]/page.tsx`의 인라인 `getBookStats`에서 완독 수 쿼리와
평점 쿼리 **둘 다** `.eq('is_public', true)`를 추가한다.

엔티티의 `src/entities/book/api/getBookStats.ts`가 이미 `publicOnly` 파라미터로
같은 일을 하고 있으므로, 그 파일의 주석에 적힌 근거("공개 서재 경로에서는 RLS와
별개로 공개 책만 명시적으로 집계한다")를 그대로 따른다.

### A-3. ReaderProfiles

worktree에 커밋되지 않은 수정이 이미 존재한다. 내용:

- `profiles.avatar_url` → `photo_url` 교정
- PostgREST 중첩 조인 제거 → `user_id` 수집 후 `profiles` 별도 조회 2단계 방식
  (`books.user_id`의 외래키는 `auth.users` 하나뿐이라 `books ↔ profiles` 조인이 PGRST200으로 실패)
- `.eq('is_public', true)` 추가 — 로그인 사용자에게 자기 비공개 기록이 섞이던 문제
- 재독(같은 사람이 같은 책을 여러 번 완독) 중복 제거
- `nickname || username` 폴백 (기존 커밋 `07cb6eb`·`36056a4`와 동일한 방침)

이 수정을 검증하고 커밋한다. 추가 변경은 없다.

### A-4. 취향 재분석 조건

`app/(public)/[username]/page.tsx`에서 `completed_date`와 `created_at`을 비교하는
추가 쿼리를 **삭제**하고, 이미 조회 중인 값으로 계산한다:

```
newBooksSinceLastAnalysis = analyzableBookCount - lastAnalysis.analyzed_books_count
```

`analyzed_books_count`는 `taste_analyses` 조회 select에 이미 포함되어 있다.
`app/api/taste-analysis/analyze/route.ts`가 저장하는 값이며, 대상 책을
`status = 'completed'` + `rating IS NOT NULL`로 조회한다 — `analyzableBookCount`와
**같은 집합**이므로 뺄셈이 성립한다.

효과:
- date/timestamptz 타입 불일치 해소
- 쿼리 1개 감소
- "과거에 읽은 책을 오늘 등록"한 경우도 정상 집계 (등록 시점이 아니라 총량 차이로 계산)
- "읽고싶어요로 등록해 뒀던 책을 나중에 완독" 하는 흐름도 정상 집계.
  리뷰가 대안으로 제안한 `books.created_at > analysis.created_at` 방식은 이 흐름을
  놓친다(등록 시점이 분석보다 앞서므로). 그래서 뺄셈 방식을 택했다.

**하한:** 책 삭제·별점 제거로 음수가 나올 수 있으므로 `Math.max(0, ...)`를 씌운다.

**알려진 한계 (수용):** 분석 라우트가 `MAX_BOOKS_FOR_PROMPT = 100`으로
`limit`을 걸기 때문에 `analyzed_books_count`는 100에서 포화된다. 분석 대상 책이
100권을 넘는 사용자는 델타가 과다 계산되어 재분석 조건을 실제보다 쉽게 통과한다.

이 오차 방향은 안전하다 — 사용자를 **막는** 쪽이 아니라 **허용하는** 쪽이고,
재분석 남용은 이미 `checkUsageLimit`의 월간 한도로 막혀 있다. 또한 타깃 사용자
(월 1~4권)가 100권에 도달하려면 수년이 걸린다. 정확히 고치려면 실제 총량을
별도 컬럼에 저장해야 하는데, 그러면 UI의 "N권 분석" 표기가 실제 분석량과
어긋난다. 트랙 F에서 평점 스키마를 손댈 때 함께 다룬다.

### A-5. 등록 폼 `10` 버튼 라벨

`src/features/book/ui/BookRegistrationForm.tsx`의 평점 버튼에서 `10`의 표시 텍스트와
`aria-label`을 "인생책"으로 바꾼다. **저장 값은 `10` 그대로 유지**한다.

폼 구조 축약(3단계 흐름, "더 남기기" 접기)은 트랙 B이므로 하지 않는다.

### A-6. 랜딩 문구 충돌

`src/widgets/landing/model/heroSlides.ts`의 `taste` 슬라이드에서 eyebrow
"완독 5권부터"와 lines "열 권이면 충분해요"가 모순이다.

실제 조건인 eyebrow를 남기고 lines를 바꾼다:

```
lines: ['다섯 권이면 충분해요', '취향은 이미 쌓였습니다']
```

파일 상단 주석의 편집 규칙(각 줄 8~12자)에 맞는다 — "다섯 권이면 충분해요" 10자.

## 테스트

**신규 단위 테스트** `src/entities/book/model/rating.test.ts` (vitest):

- `isRated`: `null` → false, `0` → false, `1`~`5`·`10` → true
- `toScore`: `10` → `5`, `3` → `3`
- `isLifeBook`: `10` → true, `5` → false, `null` → false
- `averageScore`: `[0, 5]` → `5` (0 제외), `[10, 4]` → `4.5` (10→5), `[]` → `0`, `[0]` → `0`

**기존 테스트 보강** `src/entities/book/model/libraryPeriod.test.ts`:

- `0`과 `10`이 섞인 완독 책 목록으로 `averageRating` 검증 케이스 추가
- 기존 `averageRating toBe(5)` 케이스는 평점 5점 책 1권뿐이라 정규화의 영향을 받지 않는다

**수동 검증 (로컬 Supabase):**

공개 책 페이지를 **로그아웃 상태와 로그인 상태 두 번** 열어 다음이 동일한지 확인한다.
A-2와 A-3의 핵심 검증이다.

- 완독 수
- 평균 평점
- "이 책을 완독한 사람들" 아바타 목록

같은 책에 비공개 기록을 가진 계정으로 로그인해 확인해야 의미가 있다.

## 작업 순서

1. A-1 `rating.ts` 작성 + 단위 테스트 (테스트 먼저)
2. A-1 평균 계산 2곳 교체 + 헬퍼 치환 4곳 + 죽은 `RatingDistributionChart` 삭제
   + `libraryPeriod.test.ts` 보강
3. A-2 공개 책 페이지 `is_public` 필터
4. A-3 ReaderProfiles 검증 후 커밋
5. A-4 재분석 조건
6. A-5 등록 폼 라벨
7. A-6 랜딩 문구
8. lint + 전체 테스트 + 수동 검증 → main 병합

## 이번 범위에서 제외 (명시)

- 트랙 B~F 전부
- DB 평점 컬럼 분리, 데이터 마이그레이션, `get_books_of_life`·`ranking_snapshots` 수정 (트랙 F)
- 취향 분석 5권 진입 장벽 조정 (트랙 B — 버그가 아닌 제품 결정)
- 별점 아이콘화 등 디자인 변경
- 등록 폼 구조 축약 (트랙 B)
