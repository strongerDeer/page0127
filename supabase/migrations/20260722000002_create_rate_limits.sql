-- ============================================================
-- API 레이트 리미팅 카운터
--
-- 왜 필요한가:
--   전체 API에 요청 횟수 제한이 없어서, 로그인 여부와 관계없이
--   같은 사용자(또는 IP)가 짧은 시간에 반복 호출해도 막을 방법이 없었다.
--   특히 taste-analysis/compatibility(OpenAI)·books/search(알라딘)는
--   호출마다 외부 유료 API 비용이 발생한다.
--   (docs/superpowers/specs/2026-07-22-api-rate-limiting-design.md)
--
-- 방식: 고정 윈도우(fixed window) 카운터.
--   "1분에 5번까지" 같은 규칙을 (식별자, 분 단위 시각) 조합의 행 하나로
--   세고, INSERT ... ON CONFLICT DO UPDATE로 동시 요청도 안전하게 증가시킨다
--   (Postgres가 행 잠금으로 순서를 보장해준다).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
    identifier   TEXT        NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count        INTEGER     NOT NULL DEFAULT 1,
    PRIMARY KEY (identifier, window_start)
);

COMMENT ON TABLE public.rate_limits IS
    'API 레이트 리미팅 카운터. identifier(user:<id> 또는 ip:<ip>)별로 1분 단위 요청 횟수를 센다.';

-- 청소 쿼리(window_start 기준 삭제)가 이 인덱스를 탄다.
CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
    ON public.rate_limits (window_start);

-- RLS 활성화 + 정책 없음 = anon/authenticated는 테이블에 직접 접근 불가.
-- 아래 SECURITY DEFINER 함수를 통해서만 읽고 쓸 수 있다.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;


-- ── 카운트 증가 + 현재 값 반환 (원자적) + 오래된 행 청소 ────────
--
-- 같은 (identifier, window_start) 조합에 동시에 여러 요청이 들어와도
-- Postgres의 UPSERT가 행 잠금으로 순서를 보장하므로 카운트 누락이 없다.
--
-- 청소는 별도 cron 없이 이 함수 안에서 1000번에 1번 꼴로 확률적으로
-- 1시간 지난 행을 지운다 (cron 라우트를 새로 만들지 않기 위한 선택).

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
    p_identifier   TEXT,
    p_window_start TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result INTEGER;
BEGIN
    INSERT INTO public.rate_limits (identifier, window_start, count)
    VALUES (p_identifier, p_window_start, 1)
    ON CONFLICT (identifier, window_start)
    DO UPDATE SET count = public.rate_limits.count + 1
    RETURNING count INTO result;

    IF random() < 0.001 THEN
        DELETE FROM public.rate_limits
        WHERE window_start < NOW() - INTERVAL '1 hour';
    END IF;

    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.increment_rate_limit IS
    '식별자의 이번 윈도우(분 단위) 요청 횟수를 1 증가시키고 증가된 값을 반환한다. 1000분의 1 확률로 1시간 지난 행도 함께 청소한다.';

-- 미들웨어가 로그인 여부와 무관하게(비로그인도 books/search를 호출하므로)
-- 호출해야 하므로 anon/authenticated 둘 다에게 실행 권한을 준다.
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ)
    TO anon, authenticated;
