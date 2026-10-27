-- All-or-nothing owner operations with replay protection. Receipts are not client-readable.
CREATE TABLE public.bulk_operation_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payload jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);
ALTER TABLE public.bulk_operation_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bulk_operation_receipts FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.perform_bulk_action(
  p_request_id uuid,
  p_resource text,
  p_action text,
  p_ids uuid[] DEFAULT '{}',
  p_before timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor uuid := auth.uid();
  ids uuid[];
  payload jsonb;
  receipt public.bulk_operation_receipts%ROWTYPE;
  affected uuid[];
  result jsonb;
  affected_count bigint;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = '42501'; END IF;
  IF p_request_id IS NULL OR p_ids IS NULL OR cardinality(p_ids) > 500
    OR array_position(p_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION '선택은 최대 500개까지 가능합니다.' USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(array_agg(DISTINCT id ORDER BY id), '{}') INTO ids FROM unnest(p_ids) id;
  IF p_resource IS NULL OR p_action IS NULL OR NOT ((p_resource = 'books' AND p_action IN ('public', 'private', 'delete'))
    OR (p_resource = 'notifications' AND p_action IN ('delete_selected', 'delete_read'))) THEN
    RAISE EXCEPTION '지원하지 않는 작업입니다.' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'delete_read' THEN
    IF cardinality(ids) <> 0 OR p_before IS NULL THEN
      RAISE EXCEPTION '읽은 알림 삭제 범위를 확인해주세요.' USING ERRCODE = '22023';
    END IF;
  ELSIF cardinality(ids) = 0 THEN
    RAISE EXCEPTION '항목을 선택해주세요.' USING ERRCODE = '22023';
  END IF;
  payload := jsonb_build_object('resource', p_resource, 'action', p_action, 'ids', ids, 'before', p_before);
  -- Same user's same request serializes before checking its receipt.
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text || p_request_id::text, 0));
  SELECT * INTO receipt FROM public.bulk_operation_receipts WHERE user_id = actor AND request_id = p_request_id;
  IF FOUND THEN
    IF receipt.payload <> payload THEN
      RAISE EXCEPTION '다른 작업에는 새 요청 ID가 필요합니다.' USING ERRCODE = '22023';
    END IF;
    RETURN receipt.result;
  END IF;

  IF p_resource = 'books' THEN
    PERFORM id FROM public.books WHERE user_id = actor AND id = ANY(ids) ORDER BY id FOR UPDATE;
    IF (SELECT count(*) FROM public.books WHERE user_id = actor AND id = ANY(ids)) <> cardinality(ids) THEN
      RAISE EXCEPTION '선택한 기록을 변경할 수 없습니다. 목록을 새로고침해주세요.' USING ERRCODE = '42501';
    END IF;
    IF p_action = 'delete' THEN
      -- Cross-recipient notifications need definer privileges. Delete in the same transaction.
      DELETE FROM public.notifications WHERE target_type = 'book' AND target_id = ANY(ids);
      DELETE FROM public.books WHERE user_id = actor AND id = ANY(ids);
    ELSE
      UPDATE public.books SET is_public = (p_action = 'public'), updated_at = now()
        WHERE user_id = actor AND id = ANY(ids);
    END IF;
    affected := ids;
  ELSIF p_action = 'delete_selected' THEN
    PERFORM id FROM public.notifications WHERE user_id = actor AND id = ANY(ids) ORDER BY id FOR UPDATE;
    IF (SELECT count(*) FROM public.notifications WHERE user_id = actor AND id = ANY(ids)) <> cardinality(ids) THEN
      RAISE EXCEPTION '선택한 알림을 삭제할 수 없습니다. 목록을 새로고침해주세요.' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.notifications WHERE user_id = actor AND id = ANY(ids);
    affected := ids;
  ELSE
    WITH deleted AS (
      DELETE FROM public.notifications
      WHERE user_id = actor AND is_read = true AND created_at <= least(p_before, now()) RETURNING id
    ) SELECT count(*) INTO affected_count FROM deleted;
  END IF;
  result := jsonb_build_object('count', coalesce(affected_count, cardinality(affected)), 'ids', coalesce(affected, '{}'));
  INSERT INTO public.bulk_operation_receipts(user_id, request_id, payload, result) VALUES (actor, p_request_id, payload, result);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.perform_bulk_action(uuid, text, text, uuid[], timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perform_bulk_action(uuid, text, text, uuid[], timestamptz) TO authenticated;
