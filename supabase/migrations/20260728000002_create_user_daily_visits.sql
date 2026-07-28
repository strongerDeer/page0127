-- 로그인 사용자의 "그날 왔다" 기록.
--
-- 왜 필요한가:
--   books·activities에는 **행동한 사람**만 남는다. 로그인해서 둘러보고 아무것도 하지
--   않고 나간 사람은 흔적이 없다. auth.users.last_sign_in_at은 최신 1건을 덮어쓰는
--   컬럼이라 이력이 되지 못한다. 재방문율(W1/W4)은 지금부터 적재하지 않으면 소급
--   계산이 불가능하다. 나머지 활성화 지표는 전부 기존 데이터로 소급된다.
--   판단 근거: docs/superpowers/specs/2026-07-28-visit-log-and-rating-split-design.md
--
-- 왜 하루 1행인가:
--   재방문율에 필요한 건 "그날 왔는가"뿐이다. 방문 횟수·페이지·체류시간은 어떤 판단도
--   바꾸지 않는다. 그리고 사용자 id와 묶는 순간 익명 통계가 아니라 **개인별 행동
--   기록**이 되어 개인정보처리방침에 없는 수집이 된다. 페이지 조회수·체류시간은
--   GA·Vercel Analytics가 익명으로 이미 수집 중이다.
--
-- 권한: 쓰기는 /api/visit 라우트가 service_role로(RLS 우회), 읽기는 admin 서버 코드가
--   createAdminClient로 한다. 20260724000000의 `alter default privileges`가 앞으로 생길
--   테이블에 anon/authenticated의 insert 권한까지 주므로, **RLS를 켜고 정책을 하나도
--   만들지 않는 것**이 유일한 차단 수단이다(= 전면 거부). quality_rum_samples와 같은 방식.

create table public.user_daily_visits (
  user_id        uuid not null references auth.users(id) on delete cascade,

  -- KST 달력 날짜. 서버(toKstDateKey)가 계산해 넣는다 — UTC로 자르면 한국 밤 9시
  -- 이후 방문이 다음 날로 밀린다.
  visit_date     date not null,

  -- 그날 처음 들어온 시각. "몇 시에 오는 사용자들인가"를 알려준다(알림·메일 발송
  -- 시각의 근거). upsert가 중복을 무시하므로 자연히 그날 첫 방문 시각이 남는다.
  first_visit_at timestamptz not null default now(),

  -- 복합 PK가 중복 방어의 최종 수단이다. 클라이언트가 몇 번을 보내든 하루 1행.
  primary key (user_id, visit_date)
);

-- 조회는 user_id 기준이라 PK 인덱스로 충분하다. 추가 인덱스를 만들지 않는다.

alter table public.user_daily_visits enable row level security;

comment on table public.user_daily_visits is
  '로그인 사용자의 일별 방문 기록(KST). 재방문율 계산용. 서버(service_role)만 읽고 쓴다.';
