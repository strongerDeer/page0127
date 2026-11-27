-- 연말 응원 문장 카드 — 한 사람이 한 해에 받은 응원 문장
-- 작성일: 2026-11-27
--
-- 결정 (HJ, 2026-11-27):
--   - 12월 내내 서재 주인이 선물 상자(리본)를 풀면 응원 문장 한 줄이 나온다.
--   - 문장 목록은 코드 파일(src/entities/year-cheer/model/sentences.ts)에 둔다(1번 A).
--     여기에는 "누가 어느 문장을 받았는지"만 있다.
--   - 처음 열 때 무작위로 골라 저장한다(2번 B) — 12월 중에 목록에 문장을 더 넣어도
--     이미 받은 사람의 문장은 그대로다.
--   - 친구에게 보내는 링크는 "내 카드 그대로"(3번 B) — 비회원도 볼 수 있어야 하므로 읽기는 공개.
--
-- 왜 (사용자, 연도) 가 기본 키인가: 한 해에 한 장. 다시 열어도 같은 문장(INSERT … ON CONFLICT DO NOTHING).
-- 왜 UPDATE·DELETE 정책이 없는가: 받은 문장을 바꿔 다시 뽑는 길을 막는다(선물은 한 번).

CREATE TABLE IF NOT EXISTS public.year_cheers (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year smallint NOT NULL CHECK (year BETWEEN 2026 AND 2100),
  -- 문장 열쇠 — sentences.ts 의 id (예: 'yun-new-road')
  sentence_id text NOT NULL CHECK (sentence_id ~ '^[a-z0-9-]{1,40}$'),
  opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year)
);

ALTER TABLE public.year_cheers ENABLE ROW LEVEL SECURITY;

-- 읽기는 누구나 — 친구가 받은 링크(/아이디/cheer)를 비회원으로 열어도 같은 카드가 보여야 한다.
-- 담긴 것은 "어느 문장을 받았나"뿐이고, 공개 서재 주인 이름과 함께 보이는 정보다.
DROP POLICY IF EXISTS "Anyone reads year cheers" ON public.year_cheers;
CREATE POLICY "Anyone reads year cheers" ON public.year_cheers
  FOR SELECT TO anon, authenticated USING (true);

-- 쓰기는 본인 줄 한 번만
DROP POLICY IF EXISTS "Users open own year cheer" ON public.year_cheers;
CREATE POLICY "Users open own year cheer" ON public.year_cheers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.year_cheers TO anon, authenticated;
GRANT INSERT ON public.year_cheers TO authenticated;

-- 체험 계정 쓰기 차단(20261126000200 과 같은 규칙 — app/demo-db-triggers.test.ts 가 지킨다)
do $$
declare
  t text;
begin
  foreach t in array array['year_cheers']
  loop
    execute format('drop trigger if exists zz_block_demo_writes on public.%I', t);
    execute format(
      'create trigger zz_block_demo_writes
         before insert or update or delete on public.%I
         for each statement execute function public.block_demo_writes()',
      t
    );
  end loop;
end;
$$;
