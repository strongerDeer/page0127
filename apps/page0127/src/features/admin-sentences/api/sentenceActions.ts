'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { parseSentenceForm } from '../model/sentenceForm';

/**
 * 오늘의 문장 풀 관리 (Server Actions) — 운영 기록(admin-events)과 같은 방식:
 * 서버 컴포넌트 폼이 바로 부르고, 실패하면 throw 해 에러 화면으로 알린다.
 * 사용자 화면은 풀을 직접 읽지 않으므로(RLS) 여기서는 service role 로만 쓴다.
 */
const uuid = /^[0-9a-f-]{36}$/i;

const revalidate = () => revalidatePath('/admin/sentences');

export async function createSentence(form: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseSentenceForm(form);
  if (!parsed.ok) throw new Error(parsed.message);

  const { error } = await createAdminClient()
    .from('daily_sentences')
    .insert(parsed.value);
  if (error) throw new Error(`문장 저장 실패: ${error.message}`);
  revalidate();
}

export async function updateSentence(form: FormData): Promise<void> {
  await assertAdmin();
  const id = String(form.get('id') ?? '');
  if (!uuid.test(id)) throw new Error('잘못된 요청입니다.');
  const parsed = parseSentenceForm(form);
  if (!parsed.ok) throw new Error(parsed.message);

  const { error } = await createAdminClient()
    .from('daily_sentences')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`문장 수정 실패: ${error.message}`);
  revalidate();
}

/** 활성 ↔ 비활성. 비활성 문장은 새로 뽑히지 않지만, 이미 뽑은 사람의 캘린더에는 남는다 */
export async function toggleSentenceActive(form: FormData): Promise<void> {
  await assertAdmin();
  const id = String(form.get('id') ?? '');
  if (!uuid.test(id)) throw new Error('잘못된 요청입니다.');
  const next = form.get('next') === 'true';

  const { error } = await createAdminClient()
    .from('daily_sentences')
    .update({ is_active: next, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`상태 변경 실패: ${error.message}`);
  revalidate();
}

/**
 * 삭제 — 아직 아무도 뽑지 않은 문장만. 뽑힌 문장은 FK(ON DELETE RESTRICT)가 막는다:
 * 지우면 사용자 캘린더의 그날 기록이 깨지기 때문. 그런 문장은 비활성으로 내린다.
 */
export async function deleteSentence(form: FormData): Promise<void> {
  await assertAdmin();
  const id = String(form.get('id') ?? '');
  if (!uuid.test(id)) throw new Error('잘못된 요청입니다.');

  const { error } = await createAdminClient()
    .from('daily_sentences')
    .delete()
    .eq('id', id);
  if (error)
    throw new Error(
      error.code === '23503'
        ? '이미 뽑힌 문장은 지울 수 없어요. 비활성으로 내려 주세요.'
        : `문장 삭제 실패: ${error.message}`
    );
  revalidate();
}
