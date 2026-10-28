'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { validateManualBook } from '../model/review';

export type ReviewActionState = { ok: boolean; message: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function identifiers(form: FormData) {
  const id = String(form.get('id') ?? '');
  const version = Number(form.get('version'));
  if (!uuid.test(id) || !Number.isSafeInteger(version) || version < 1)
    throw new Error('등록 정보를 새로고침해 주세요.');
  return { id, version };
}
export async function reviewBook(
  _state: ReviewActionState,
  form: FormData
): Promise<ReviewActionState> {
  const admin = await assertAdmin();
  try {
    const { id, version } = identifiers(form);
    const decision = String(form.get('decision') ?? '');
    const note = String(form.get('note') ?? '').trim();
    if (
      !['approved', 'needs_changes', 'rejected'].includes(decision) ||
      note.length > 1000 ||
      (decision !== 'approved' && !note)
    ) {
      return {
        ok: false,
        message: '보완 요청과 반려에는 사유를 입력해 주세요(최대 1000자).',
      };
    }
    const { error } = await createAdminClient().rpc('review_catalog_book', {
      p_book_id: id,
      p_version: version,
      p_decision: decision,
      p_note: note,
      p_reviewer: admin.id,
    });
    if (error)
      return {
        ok: false,
        message:
          error.code === '40001'
            ? '등록 정보가 변경됐어요. 새로고침 후 다시 확인해 주세요.'
            : '검수 처리에 실패했습니다.',
      };
    revalidatePath('/admin/books');
    revalidatePath('/books/requests');
    revalidatePath('/books');
    return { ok: true, message: '검수 결과를 저장했습니다.' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '입력을 확인해 주세요.',
    };
  }
}

export async function resubmitBook(
  _state: ReviewActionState,
  form: FormData
): Promise<ReviewActionState> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, message: '로그인이 필요합니다.' };
  try {
    const { id, version } = identifiers(form);
    const values = validateManualBook({
      ...Object.fromEntries(form),
      isbn: '',
    });
    const { data, error } = await client
      .from('global_books')
      .update({
        title: values.title,
        author: values.author,
        publisher: values.publisher,
        source_url: values.source_url,
        review_status: 'pending',
      })
      .eq('id', id)
      .eq('submitted_by', user.id)
      .eq('review_version', version)
      .neq('review_status', 'approved')
      .select('id')
      .maybeSingle();
    if (error || !data)
      return {
        ok: false,
        message:
          '정보가 변경됐거나 수정할 수 없는 요청입니다. 새로고침해 주세요.',
      };
    revalidatePath('/books/requests');
    revalidatePath('/admin/books');
    revalidatePath('/books');
    return { ok: true, message: '수정한 정보를 다시 검수 요청했어요.' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '입력을 확인해 주세요.',
    };
  }
}
