'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { parseSentenceForm } from '../model/sentenceForm';

/**
 * 오늘의 문장 풀 관리 (Server Actions) — 목록 화면(클라이언트)이 부르고 결과를 돌려받는다.
 * 저장됐는지 토스트로 알려 주려고 throw 대신 { ok, message } 를 돌려준다(HJ, 2026-11-10).
 * 권한 없음(assertAdmin)만은 그대로 throw — 화면에서 다룰 상황이 아니다.
 * 사용자 화면은 풀을 직접 읽지 않으므로(RLS) 여기서는 service role 로만 쓴다.
 */
const uuid = /^[0-9a-f-]{36}$/i;

const revalidate = () => revalidatePath('/admin/sentences');

export type SentenceActionResult =
  { ok: true } | { ok: false; message: string };

const fail = (message: string): SentenceActionResult => ({
  ok: false,
  message,
});

export async function createSentence(
  form: FormData
): Promise<SentenceActionResult> {
  await assertAdmin();
  const parsed = parseSentenceForm(form);
  if (!parsed.ok) return fail(parsed.message);

  const { error } = await createAdminClient()
    .from('daily_sentences')
    .insert(parsed.value);
  if (error) {
    console.error('[admin] 문장 저장 실패:', error.message);
    return fail('문장을 저장하지 못했어요. 다시 시도해 주세요.');
  }
  revalidate();
  return { ok: true };
}

export async function updateSentence(
  form: FormData
): Promise<SentenceActionResult> {
  await assertAdmin();
  const id = String(form.get('id') ?? '');
  if (!uuid.test(id)) return fail('잘못된 요청입니다.');
  const parsed = parseSentenceForm(form);
  if (!parsed.ok) return fail(parsed.message);

  const { error } = await createAdminClient()
    .from('daily_sentences')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[admin] 문장 수정 실패:', error.message);
    return fail('문장을 고치지 못했어요. 다시 시도해 주세요.');
  }
  revalidate();
  return { ok: true };
}

/** 활성 ↔ 비활성. 비활성 문장은 새로 뽑히지 않지만, 이미 뽑은 사람의 캘린더에는 남는다 */
export async function toggleSentenceActive(
  form: FormData
): Promise<SentenceActionResult> {
  await assertAdmin();
  const id = String(form.get('id') ?? '');
  if (!uuid.test(id)) return fail('잘못된 요청입니다.');
  const next = form.get('next') === 'true';

  const { error } = await createAdminClient()
    .from('daily_sentences')
    .update({ is_active: next, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[admin] 상태 변경 실패:', error.message);
    return fail('상태를 바꾸지 못했어요. 다시 시도해 주세요.');
  }
  revalidate();
  return { ok: true };
}

/**
 * 삭제 — 아직 아무도 뽑지 않은 문장만. 뽑힌 문장은 FK(ON DELETE RESTRICT)가 막는다:
 * 지우면 사용자 캘린더의 그날 기록이 깨지기 때문. 그런 문장은 비활성으로 내린다.
 */
export async function deleteSentence(
  form: FormData
): Promise<SentenceActionResult> {
  await assertAdmin();
  const id = String(form.get('id') ?? '');
  if (!uuid.test(id)) return fail('잘못된 요청입니다.');

  const { error } = await createAdminClient()
    .from('daily_sentences')
    .delete()
    .eq('id', id);
  if (error) {
    if (error.code === '23503')
      return fail('이미 뽑힌 문장은 지울 수 없어요. 비활성으로 내려 주세요.');
    console.error('[admin] 문장 삭제 실패:', error.message);
    return fail('문장 삭제에 실패했어요. 다시 시도해 주세요.');
  }
  revalidate();
  return { ok: true };
}
