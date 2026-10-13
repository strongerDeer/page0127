# 서재(프로필) 페이지 재구성 설계

> 2026-10-13 · 대화로 확정한 방향을 구현 단위로 옮긴다. 진행 방식: 단계별 확인 · 브레인스토밍 전체 절차
> (커밋·푸시는 사용자 전용). 화면 목업: 브레인스토밍 A안 v3(같은 대화).

## 1. 왜 하나

`/[username]` 은 남이 처음 보는 내 얼굴인데, 위에서부터 읽으면 무엇이 자랑인지 흐리다.

- 기본 탭이 **전체**라 올해 무엇을 읽는지가 바로 안 보인다.
- 취향분석 카드 10장이 헤더 아래 깔리는데 같은 성향이 반복돼 같은 카드가 줄을 선다.
- 맨 아래 **책장 / 보관** 버튼은 무엇인지 알 수 없다('보관' = `is_public=false` 책. 읽고 싶어요와 무관,
  '책장' 버튼은 눌러도 변화 없음).
- 올해 요약의 주인공이 "목표까지 26권 남음"이라 **읽은 14권**이 묻힌다.
- 월별 추이 차트가 360px 높이로 2/3 폭을 차지한다(방문자는 옆 칸이 비어 더 커 보인다).
- **독서 캘린더가 다른 달로 넘기면 항상 0권** — 버그(§5.1).
- 카테고리 레이더에 `경제경영`·`경제/경영`이 따로 뜬다 — 0권 분야를 채워 넣는 더미 목록 오타.

**성공 기준**

- 처음 온 방문자가 첫 화면에서 "누구 · 어떤 성향 · 올해 몇 권"을, 스크롤 한 번에 책장을 본다.
- 캘린더가 어느 달로 넘겨도 그 달 공개 완독 책을 표지로 보여 준다.
- 주인은 목표 대비 속도와 "다음에 무엇을 하면 되는지"를 한 문장으로 받는다.
- 분야를 고르게 읽고 있는지가 숫자·모양·빈 분야로 보인다.

## 2. 범위

**한다**: 연도 뷰(`?year=YYYY`, 기본)의 배치 전면 재구성, 기본 연도 변경, 취향 카드 + 변화 뱃지(방문자 공개),
책장 강화, 비공개 책 펼치기, 올해 요약(속도 한마디 + 환산), 독서 균형 카드, 달력 재작성(방문자 공개),
평점·인생책 카드, 캘린더 버그 제거(코드 삭제로).

**하지 않는다**: '전체'(`?year=all`) 화면 변경, 0권 분야 칩 → 검색 이동, 공개 여부 설정 토글,
'읽고 싶어요' 탭 변경, 카테고리 매퍼 규칙 변경.

## 3. 화면 (위에서 아래 순서)

색·간격·모서리는 목업 값이 아니라 **기존 디자인 토큰**(`bg-accent`, `bg-card`, `text-text-subtle`,
`heading-1`, `--chart-1~7`)을 쓴다. 새 색·새 라이브러리 없음.

```
① 헤더          프로필(아바타·이름·@·팔로우 수·소개·버튼)        │ 취향 카드
                                                               │  AI 독서 성향 · 날짜 · N권 기준
                                                               │  내일의 나를 준비하는 사람   (heading 크기)
                                                               │  #관계 #심리 #일상의 철학 #에세이 톤
                                                               │  취향의 변화: [한 우물을…×2] → [내일의 나를…×2]
   탭           [전체] | [2026] 2025 2024 2023 | [읽고 싶어요]     ← 기본 = 올해
② 올해 요약     14권(가장 큰 숫자)  │ 한마디(속도) + 목표 막대(오늘 기준 눈금) + 환산 4칸
③ 읽는 중       한 줄(높이 ~72px)
④ 책장          2026년 서재 14권   [🔍 · 필터 · 정렬] [책등 | 표지]
                선반 여러 단 · 꺼내기 효과 · 읽는 중 책갈피 · 연도 명판
                🔒 나만 보는 비공개 책 3권 펼치기 ▾        (주인만)
⑤ 독서 균형     9축 레이더 │ 한 줄 요약 · 작년 대비 · 고른 정도 점수 · 식단 띠 · 순위 · 아직 0권 칩
⑥ 달력 + 평점   독서 캘린더(1/2) 월 칩 12개 + 표지 + 기간 막대 │ 평점 분포 + 올해의 인생책 표지
```

데스크톱 기준 세로 길이는 현재 대비 약 40% 감소(월별 차트 360px·BOOKS OF 콜라주 제거).
모바일(375px)은 전부 한 열. 취향 카드는 프로필 아래 전체 폭, 레이더는 균형 카드 위쪽.

### ① 취향 카드

- 최신 분석: 성향 이름(큰 글씨) + `preference_profile.liked.topics` 앞 4개를 `#키워드` 칩.
- 변화 뱃지 줄: 최신 10건을 **시간순(오래된 → 최신)** 으로, **연속된 같은 성향은 한 뱃지 + `×N`**,
  뱃지 옆 작은 글씨로 시작 월. 색 점 = `getPersonalityColor`.
- 주인: 카드에 "다시 분석 (n/3 남음)" 버튼(기존 게이트·다이얼로그 그대로 이동), 뱃지 클릭 → 그 회차 상세.
  방문자: 같은 카드, 클릭 없음.
- 분석 없음: 주인 → "평가한 책 3/5권 — 2권 더 모이면 AI가 성향을 알려줘요" 자리표시.
  방문자 → 카드 숨김, 프로필이 전체 폭.
- 헤더의 기존 성향 칩, `TasteAnalysisHistoryCards` 는 제거.

### 탭 · 기본 연도

- `?year` 없음 → 올해. 올해 서재가 비어 있으면(읽는 중·완독 모두 0) 책이 있는 가장 최근 해. 그것도 없으면 올해.
- 전체는 `?year=all`(현재도 동작). 탭 클릭은 지금처럼 `pushState`.

### ② 올해 요약

- 왼쪽: "2026년에 완독한 책" + **권수(가장 큰 숫자)**.
- 오른쪽 위: 한마디(굵게) + 보조 문장. 아래 "목표 40권 · 35%" + 6px 막대 + **오늘 기준 예상 위치 눈금**.
- 환산 4칸(계산 가능한 것만): 읽은 쪽수 + 쌓은 높이(쪽수 ÷ 2 × 0.1mm), 예상 독서 시간
  (기존 규칙 **1분/쪽** — 4,352쪽 ≈ 73시간 ≈ 영화 36편(2시간)), 가장 많이 읽은 달, 평균 평점 · 인생책 수.
- 주인 + 올해 + (목표 있음 → "목표 수정" / 없음 → "목표 정하기"). 기존 `ReadingGoalDialog` 재사용.

**한마디 규칙** (`f` = 올해 경과율, `expected = target × f`, `projected = round(completed ÷ f)`,
`weeksLeft` = 남은 일수 ÷ 7, `perWeek = (target − completed) ÷ weeksLeft`)

| 상태 | 조건 | 문구(예) |
| --- | --- | --- |
| 달성 | completed ≥ target | 목표 달성! 지금부터는 보너스 책이에요 (+N권) |
| 앞섬 | completed ≥ expected + 1 | 목표보다 N권 앞서 있어요. 이 속도면 12월엔 P권 |
| 딱 맞음 | \|completed − expected\| < 1 | 지금 페이스 그대로면 12월에 딱 T권이에요 |
| 조금 뒤 | perWeek ≤ 3 | 지금 속도면 올해 약 P권 · 남은 W주, 일주일에 X권이면 닿아요 |
| 많이 뒤 | perWeek > 3 | 남은 기간엔 빠듯해요 — 주인에게만 "목표를 다시 정해 볼까요?" + 버튼 |
| 목표 없음 | target = 0 | 한 달에 M권씩 읽고 있어요 (주인: + 목표 정하기) |

- 지난해 탭: 확정 문장("40권 목표 중 36권, 4권 모자랐어요" / "목표를 달성했어요").
- 방문자: 같은 문장을 3인칭으로, 조언·버튼 없음.
- 연초 보호: `f < 0.04`(1월 첫 2주 남짓)면 예상 권수를 만들지 않고 "올해 목표 T권, 이제 시작이에요 ·
  일주일에 X권씩이면 닿아요"로 말한다(상태 `early`).

### ③ 읽는 중

- 표지 32×48 + 제목 한 줄, 시작일이 있으면 `10/2~`. 0권이면 렌더하지 않음(현재와 같음).

### ④ 책장 (주인공)

- 책등 보기(기본): 현재 규칙(5점·인생책은 표지 정면, 나머지 책등 이미지·두께 폭) 유지 + 아래 변경.
  - **왼쪽부터 채우고 폭을 넘으면 여러 단.** 단마다 선반 판(토큰 기반 면 + 그림자). 단 높이 ≈ 200px.
  - **꺼내기 효과**: hover/focus 시 `translateY(-12px)` + 제목·평점 말풍선. `prefers-reduced-motion` 이면 이동 없음.
    모바일은 탭 → 상세(현재와 같음).
  - **읽는 중인 책을 선반 끝에** 꽂고 책갈피 리본(장식, `aria-hidden`). 링크·접근명은 "읽는 중" 포함.
  - 마지막 단 오른쪽 아래 **연도 명판**(장식).
- 보기 전환: 아이콘만 → "책등 / 표지" 글자 세그먼트. 표지 보기 = 기존 피드형(격자), 인생책 강조 테두리.
- 맨 아래 '책장/보관' 버튼 삭제 → 책장 카드 안 **"🔒 나만 보는 비공개 책 N권 펼치기"**(주인 + N>0 일 때만).
  펼치면 같은 책장 렌더러로 그린다.

### ⑤ 독서 균형

- 대상: 선택 연도의 공개 완독 책(통계와 같은 집합). `기타` 는 계산·축에서 제외.
- 레이더: `MAIN_CATEGORIES` 중 기타 제외 **9축 고정**(0권도 축 유지) — 기존 `CategoryRadarChart` 에 고정 데이터.
- 한 줄 요약: "9개 분야 중 K개를 읽었어요. A·B가 S%".
- 작년 대비(작년 완독이 있을 때만): 읽은 분야 수 증감 + 새로 생긴 분야 이름.
- 고른 정도 = `round(H / ln 9 × 100)`, `H = −Σ p·ln p`(0권 분야 제외). 1권이면 0.
  문구는 **진행형**(2026-10-08 판단형 문구 반려 기록에 따름): 0~39 "한 우물을 깊이 파는 중" ·
  40~69 "조금씩 넓혀 가는 중" · 70~100 "고르게 읽는 중". 완독 3권 미만이면 점수 대신 "책이 더 쌓이면 보여요".
- 식단 띠(100% 가로 막대) + 순위 막대 + "아직 0권" 칩. 분야 색 = 순위 순서대로 `--chart-1~7`,
  8·9위는 `--chart-5` 계열 공유(실제 9분야 모두 읽는 경우만 해당).

### ⑥ 달력 + 평점

- 달력(1/2 폭): 헤더 `‹ 2026년 9월 ›` + **월 칩 12개**(책 있는 달에 점, 누르면 그 달). 칸 높이 ≈ 58px.
  - 완독일 칸에 표지(26×39). 같은 날 여러 권 → 겹쳐 쌓고 `+N`. 클릭 → 그 날 책 목록 다이얼로그(현재 동작 유지).
  - 시작일이 있는 책만 시작~완독(읽는 중이면 오늘까지) **3px 색 막대**. 겹치면 줄(lane)을 나눠 최대 3줄,
    넘치면 칸에 `+N`. 막대 색 = 책별 `--chart-*` 순환, 같은 책의 표지 테두리도 같은 색.
  - 초기 달: 올해 탭 = 이번 달, 지난해 탭 = 그 해 마지막 완독 달(없으면 12월).
  - 요약 "9월 1권 완독 · 312쪽".
  - **주인 화면에서만 비공개 책도 그린다** — 표지·기간 막대를 반투명(`opacity-50`)으로, 다이얼로그 목록에
    "비공개" 표시. 월 요약 숫자는 공개 책만 세고 뒤에 "· 비공개 N권"을 덧붙인다(통계 숫자와 어긋나지 않게).
    월 칩의 점은 공개 책 기준.
- 평점 카드(1/2 폭): 분포(인생책·5~1점, 0점 제외)를 순위 막대로 + **올해의 인생책** 표지(최대 3권).
  분포 행 클릭 → 책장 평점 필터(현재 동작 유지).

## 4. 데이터

페이지는 이미 책 전체를 받는다(주인 = 비공개 포함, 방문자 = 공개만). **새 조회는 취향 RPC 하나뿐**.

| 쓰는 곳 | 입력 |
| --- | --- |
| 올해 요약·균형·평점 | 공개 책만(`is_public`) — 통계와 같은 기준이라 주인·방문자가 같은 숫자를 본다 |
| 달력 | 방문자 = 공개 책만. 주인 = 공개 + 비공개(반투명, 요약 숫자는 공개만) |
| 책장 | 공개 책 + (주인) 비공개 펼치기 |
| 취향 카드 | `get_public_taste_history(p_user_id)` |

### 4.1 마이그레이션: `get_public_taste_history`

```sql
-- 테이블 RLS(본인만 SELECT)는 그대로. 공개해도 되는 칸만 골라 주는 함수
create function public.get_public_taste_history(p_user_id uuid)
returns table (id uuid, personality_type text, created_at timestamptz,
               analyzed_books_count int, liked_topics text[])
language sql stable security definer set search_path = public as $$
  select t.id, t.personality_type, t.created_at, t.analyzed_books_count,
         case when row_number() over (order by t.created_at desc) = 1
              then array(select jsonb_array_elements_text(t.preference_profile->'liked'->'topics'))
         end
  from taste_analyses t
  where t.user_id = p_user_id
  order by t.created_at desc
  limit 10;
$$;
revoke all on function public.get_public_taste_history(uuid) from public;
grant execute on function public.get_public_taste_history(uuid) to anon, authenticated;
```

- 공개하지 않는 것: `personality_description`, `disliked`, `patterns`, `analysis_model`, `cost_in_cents`.
- 파일명 번호는 `git ls-tree origin/main supabase/migrations/` 로 충돌 확인(현재 최신 `20261004000000`).
- 적용 순서: **개발 DB 먼저** → CI E2E → 머지 전 운영 적용을 사용자에게 말로 확인.
- `page.tsx` 의 `latestAnalysis`·주인용 `history` 조회를 이 RPC 하나로 바꾼다. 주인 전용 값
  (`analyzableBookCount`·`newBooksSinceLastAnalysis`·남은 횟수)은 지금처럼 주인일 때만 계산 —
  `newBooksSinceLastAnalysis` 는 RPC 결과 첫 행의 `analyzed_books_count` 로 같은 식을 쓴다.

## 5. 코드 변경

### 5.1 캘린더 버그 — 고치지 않고 지운다

`/api/books/calendar` 는 `{ data, summary }` 만 반환(`successResponse`)하는데
`CalendarBlock` 이 `if (!json.success) throw` 로 **없는 필드**를 검사한다 → 월 이동 시 항상 throw →
`result` undefined → 0권. 첫 달만 서버 initialData 로 보인다. 운영 데이터로 확인: 9월에
`2026-09-05` 완독 책이 있는데 0권.
새 달력은 이미 받은 `books` 로 그리므로 다음을 **삭제**한다: `CalendarSection`, `CalendarBlock`,
`CalendarBlockError`, `CalendarBlockSkeleton`, `widgets/dashboard/ReadingCalendar`, `app/api/books/calendar`,
`shared/api/endpoints.ts` 의 해당 항목. (`grep` 결과 이 페이지 외 사용처 없음.)

### 5.2 순수 함수 (`entities/book/model`, 각 `*.test.ts`)

| 함수 | 반환 |
| --- | --- |
| `resolveDefaultLibraryYear(books, currentYear)` | 기본 연도 |
| `getReadingPace({ completed, target, year, today })` | `{ state, expected, projected, weeksLeft, perWeek, surplus }` |
| `calculateReadingBalance(books, prevYearBooks?)` | `{ categories[9], readCount, topShare, score, zero[], prevDelta? }` |
| `buildCalendarMonth(books, year, month, today)` | 주 배열 · 칸별 `{ day, completions[], lanes[], overflow }`(각 항목에 `isPublic`) + 월 요약(공개 권수·쪽수, 비공개 권수) + 공개 책 있는 달 목록 |
| `groupTasteHistory(items)` (`entities/taste-analysis/model`) | 연속 같은 성향 묶음 `{ type, count, startedAt, latestId }[]` |

날짜는 문자열 `YYYY-MM-DD` 로 비교한다(타임존 변환 없음). "오늘"은 `Asia/Seoul` 기준
(`getCurrentLibraryYear` 와 같은 방식)으로 받아 넘긴다.

### 5.3 UI

| 파일 | 변경 |
| --- | --- |
| `features/taste-analysis/ui/TasteProfileCard.tsx` (신규) | ① 취향 카드 |
| `widgets/public-library/PublicLibraryHeader.tsx` | 성향 칩·이력 카드 제거, 버튼을 프로필 아래로, 오른쪽에 취향 카드 |
| `features/stats/ui/YearSummary.tsx` (신규, `ReadingProgressOverview` 대체) | ② |
| `widgets/library/ReadingNowStrip.tsx` | ③ 축소 |
| `widgets/book/ui/PublicBookShelf.tsx` + `.module.css` | ④ 여러 단·꺼내기·책갈피·명판 |
| `features/stats/ui/DashboardBookList.tsx` | 보기 전환 글자 세그먼트, 비공개 펼치기 슬롯 |
| `features/stats/ui/ReadingBalanceCard.tsx` (신규) | ⑤ (레이더는 `CategoryRadarChart` 재사용) |
| `widgets/library/ReadingCalendar.tsx` (신규) | ⑥ 달력 |
| `features/stats/ui/RatingSummaryCard.tsx` (신규) | ⑥ 평점 + 인생책 |
| `widgets/library/LibraryView.tsx` | 연도 뷰 배치 교체, `DashboardCharts`·월 필터 진입점 제거 |
| `widgets/public-library/PublicLibraryContent.tsx` | 기본 연도, 보관 버튼 제거, 취향 데이터 전달 |
| `app/(public)/[username]/page.tsx` | RPC 조회, `calendarSlot` 제거 |

연도 뷰에서 더 쓰이지 않게 되는 `DashboardCharts`·`ReadingProgressOverview`·월 필터(`selectedMonth`)는
다른 사용처를 `grep` 으로 확인한 뒤 없으면 같은 단계에서 지운다. 0권 분야를 채우는 더미 목록은 '전체' 화면이
아직 쓰므로 이번에는 오타(`경제경영` → `경제/경영`)만 고친다.

## 6. 검증

- vitest: §5.2 함수 5개. 경계값 — 12/31·1/1, 윤년, 같은 날 3권, 시작일 없음, 시작>완독(데이터 오류 → 막대 생략),
  4권 이상 겹침(+N), 월을 걸친 기간, 1권만 있는 균형, 연속·비연속 같은 성향.
- `e2e/public-library.spec.ts`: 방문자에게 달력·취향 카드가 보이고, 비공개 책 펼치기가 없다.
- 로컬 dev 에서 주인·방문자 × 데스크톱·375px 캡처. 캘린더를 3개월 넘겨 표지가 계속 뜨는지 직접 확인.
- `npm run lint`·`tsc`·`vitest` 통과 후에만 완료 보고.

## 7. 구현 단위 (커밋 하나 = 리뷰 가능한 100~200줄)

1. 기본 연도 + 보관 버튼 → 책장 안 비공개 펼치기
2. 순수 함수: `getReadingPace` · `calculateReadingBalance` (+ 테스트)
3. ② `YearSummary` 교체
4. ⑤ `ReadingBalanceCard`
5. 순수 함수 `buildCalendarMonth` (+ 테스트)
6. ⑥ 새 달력 + 평점 카드, 옛 캘린더·API 삭제
7. 마이그레이션 `get_public_taste_history` + `groupTasteHistory`(+ 테스트) + page 조회 교체
8. ① `TasteProfileCard` + 헤더 재배치
9. ④ 책장 강화(여러 단·꺼내기·책갈피·명판·글자 세그먼트)
10. ③ 읽는 중 축소 + 연도 뷰 배치 마무리 + 쓰이지 않는 코드 정리 + e2e
