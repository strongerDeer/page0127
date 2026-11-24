-- 독서 케미 결과 공유 (2026-11-24 HJ)
--
-- 지금까지는 결과 한 줄을 두 사람 모두 읽을 수 있었지만(SELECT 정책: 둘 중 한 명), 상대에게 알리는
-- 장치가 없어 상대는 결과가 있는 줄 몰랐다. HJ: "상대방도 알면 좋겠다, 물론 나만 볼 수도 있고"
-- → 기본은 분석한 사람만 보고, 결과 화면의 "○○ 님에게 알리기"를 누르면 상대도 보고 알림을 받는다.
--
-- 순서: dev push → 운영 push → 코드 PR 머지·배포.
--   마이그레이션이 먼저 들어가도 안전하다 — 옛 코드는 requested_by 를 안 넣고, requested_by 가 null 인
--   행은 지금처럼 두 사람 모두 본다. 코드가 먼저 나가면 없는 칸을 써서 분석 저장이 실패한다.
--
-- 이미 쌓인 결과(requested_by null)는 누가 분석했는지 모르니 지금처럼 두 사람 모두 본다(알림은 없음).

alter table public.compatibility_analyses
  add column if not exists requested_by uuid references auth.users(id) on delete set null,
  add column if not exists shared_at timestamptz;

alter table public.compatibility_analyses
  drop constraint if exists compatibility_analyses_requested_by_in_pair;
alter table public.compatibility_analyses
  add constraint compatibility_analyses_requested_by_in_pair
  check (requested_by is null or requested_by in (user_id_1, user_id_2));

comment on column public.compatibility_analyses.requested_by is
  '분석을 실행한 사람. null = 이 칸이 생기기 전 결과(누가 했는지 모름) → 두 사람 모두 본다';
comment on column public.compatibility_analyses.shared_at is
  '상대에게 알린 시각. null 이면 requested_by 만 본다';

-- 조회: 분석한 사람, 또는 상대에게 알린(또는 요청자를 모르는 옛) 결과면 두 사람 모두
drop policy if exists "Users can view their compatibility analyses" on public.compatibility_analyses;
drop policy if exists "Users can view their own compatibility analyses" on public.compatibility_analyses;
create policy "Users can view their own compatibility analyses"
  on public.compatibility_analyses for select
  using (
    auth.uid() = requested_by
    or (
      (shared_at is not null or requested_by is null)
      and auth.uid() in (user_id_1, user_id_2)
    )
  );

-- 상호 추천도 같은 규칙 — 결과를 못 보는 상대가 REST 로 추천만 읽어 가지 않게
drop policy if exists "Users can view their mutual recommendations" on public.mutual_recommendations;
create policy "Users can view their mutual recommendations"
  on public.mutual_recommendations for select
  using (
    exists (
      select 1 from public.compatibility_analyses ca
      where ca.id = mutual_recommendations.compatibility_analysis_id
        and (
          ca.requested_by = auth.uid()
          or (
            (ca.shared_at is not null or ca.requested_by is null)
            and auth.uid() in (ca.user_id_1, ca.user_id_2)
          )
        )
    )
  );

-- 알림 종류에 'chemistry'(케미 결과를 보냈어요) 추가. 넣는 건 서버(service_role)만 한다
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'comment', 'like', 'reading_reminder', 'weekly_recap', 'reading_nudge', 'chemistry'));
