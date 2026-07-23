-- 레이트리밋 RPC를 외부(anon)에 닫는다 + 윈도우 내부 계산 + 확률 청소 제거
--
-- 문제 (20260722000002에서):
--   increment_rate_limit이 anon/authenticated에게 EXECUTE를 허용하고
--   임의의 identifier·window_start를 인자로 받았다. 공개 anon 키로 Supabase REST의
--   rpc 엔드포인트를 직접 호출하면 공격자가
--     - 특정 사용자(예: 'strict:user:<id>')의 카운터를 미리 올려 정상 요청을 차단하거나
--     - 임의 timestamp로 행을 대량 생성해 DB 부하를 유발하고
--     - 앱 레이어 레이트리밋을 통째로 우회할 수 있었다.
--
-- 해결:
--   1) window_start를 인자로 받지 않고 함수 내부에서 now() 기준으로 계산 → timestamp 위조 불가
--   2) 함수 안의 확률 청소(random()<0.001) 제거 → 별도 cron
--      (/api/cron/cleanup-rate-limits)이 정기적으로 오래된 행을 정리
--   3) EXECUTE 권한을 PUBLIC/anon/authenticated에서 회수하고 service_role에만 부여
--      → 서버(proxy)가 service_role로만 호출한다. 외부 키로는 호출 자체가 불가.
--
-- 작성일: 2026-07-23

-- 기존 2-인자 함수 제거 (권한도 함께 사라진다)
DROP FUNCTION IF EXISTS public.increment_rate_limit(TEXT, TIMESTAMPTZ);

-- 새 함수: identifier만 받고 윈도우는 내부에서 계산한다.
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
    p_identifier TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start TIMESTAMPTZ := date_trunc('minute', now());
    result INTEGER;
BEGIN
    INSERT INTO public.rate_limits (identifier, window_start, count)
    VALUES (p_identifier, v_window_start, 1)
    ON CONFLICT (identifier, window_start)
    DO UPDATE SET count = public.rate_limits.count + 1
    RETURNING count INTO result;

    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.increment_rate_limit(TEXT) IS
    '식별자의 현재 1분 윈도우 요청 횟수를 1 증가시키고 증가된 값을 반환한다. 윈도우는 함수 내부에서 now() 기준으로 계산하며, service_role만 실행할 수 있다.';

-- 새로 만든 함수는 기본적으로 PUBLIC에 EXECUTE가 부여되므로 명시적으로 회수한다.
REVOKE ALL ON FUNCTION public.increment_rate_limit(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_rate_limit(TEXT) FROM anon, authenticated;

-- 서버(service_role)만 호출할 수 있게 한다.
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT) TO service_role;
