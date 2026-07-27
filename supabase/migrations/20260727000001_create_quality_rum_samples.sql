-- 자체 RUM(실사용자 성능) 원시 샘플.
--
-- 왜 quality_field_history를 쓰지 않고 새 테이블인가:
--   그 테이블은 CrUX의 **28일 이동창 p75**를 (period_end, metric) PK로 담는다. 자체 RUM은
--   **개별 방문의 값**이라 창 길이도 저장 단위도 다르다. 한 컬럼에 섞으면 서로 다른 것을 잰
--   숫자가 한 선으로 이어진다. 판단 근거: apps/page0127/docs/rum-field-metrics.md §4
--
-- 왜 집계하지 않고 원시로 쌓는가:
--   사용자 10명 규모에서 연 9만 행 수준이라 부담이 없고, 원시로 두면 나중에 p95·다른 창
--   길이로 다시 계산할 수 있다. 접으면 되돌릴 수 없다. (같은 문서 §5)
--   행이 100만을 넘으면 일별 롤업 테이블을 만들고 여기는 180일 보존으로 자른다.
--
-- 권한: 쓰기는 /api/rum 라우트가 service_role로(RLS 우회), 읽기는 admin 서버 코드가
--   createAdminClient로 한다. 20260724000000의 `alter default privileges`가 앞으로 생길
--   테이블에 anon/authenticated의 insert 권한까지 주므로, **RLS를 켜고 정책을 하나도
--   만들지 않는 것**이 유일한 차단 수단이다(= 전면 거부). quality_records와 같은 방식.

create table public.quality_rum_samples (
  id            bigint generated always as identity primary key,
  received_at   timestamptz not null default now(),

  -- 지표 5종. 값의 단위가 서로 다르다 — cls만 무단위, 나머지는 ms.
  metric        text not null check (metric in ('lcp', 'inp', 'cls', 'fcp', 'ttfb')),
  value         double precision not null check (value >= 0),

  -- web-vitals가 CWV 표준 임계로 매긴 등급. 우리가 다시 계산하지 않고 그대로 받아 둔다
  -- (임계가 바뀌면 라이브러리가 먼저 반영한다). 판정 색은 조회 시 자체 임계로도 계산한다.
  rating        text check (rating in ('good', 'needs-improvement', 'poor')),

  -- web-vitals가 페이지 로드마다 지표별로 발급하는 고유 id.
  -- 같은 id로 다시 오면 **나중 값이 최종값**이다(라이브러리 계약) → 중복 행 대신 갱신한다.
  metric_id     text not null,

  -- 정규화된 라우트 패턴('/[username]/[bookId]'). 원문 경로는 사용자명·책 id를 품고
  -- 카디널리티가 높아 그룹핑이 안 된다. 정규화는 서버(normalizeRoute)에서 한다.
  route         text not null,

  form_factor   text not null check (form_factor in ('mobile', 'desktop')),
  -- CrUX는 Chrome만 본다. 자체 RUM은 Safari LCP/INP(26.2+)까지 잡히므로 브라우저를
  -- 남겨야 "CLS 표본이 왜 적은가"(Chromium 전용 API)를 설명할 수 있다.
  browser       text not null check (browser in ('chrome', 'safari', 'firefox', 'edge', 'other')),

  -- 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore'.
  -- bfcache 복원은 로드가 아니라 복원이라 값이 구조적으로 빠르다 — 섞어 보면 안 된다.
  navigation_type text,

  -- 익명 세션 난수. 로그인 사용자 id는 붙이지 않는다(개인 성능 프로파일을 만들지 않는다).
  -- 한 방문의 여러 지표를 묶어 보는 용도.
  session_id    text not null,

  -- 원인 규명용 부가정보(LCP 요소 셀렉터, INP를 만든 상호작용, CLS 유발 요소 등).
  -- 표본이 적은 초기에는 p75보다 이쪽이 쓸모 있다. 스키마가 지표마다 달라 jsonb.
  attribution   jsonb,

  -- 'production' | 'preview' | 'development'. 대시보드는 production만 집계한다
  -- (프리뷰·로컬 측정이 운영 지표를 오염시키지 않도록).
  env           text not null check (env in ('production', 'preview', 'development')),

  -- 배포 식별(git sha). 어느 배포부터 느려졌는지 가른다. 없을 수 있다.
  release       text,

  -- 같은 지표 인스턴스가 두 번 오면 갱신한다(sendBeacon 재전송·bfcache 재보고 방어).
  unique (metric, metric_id)
);

alter table public.quality_rum_samples enable row level security;

-- p75 집계 쿼리의 주 접근 경로: "production인 최근 N일의 metric별 값".
create index quality_rum_samples_metric_time_idx
  on public.quality_rum_samples (metric, received_at desc)
  where env = 'production';

-- 라우트별로 쪼개 볼 때. 보존 정리(오래된 것부터 삭제)도 이 인덱스를 탄다.
create index quality_rum_samples_route_time_idx
  on public.quality_rum_samples (route, received_at desc);
