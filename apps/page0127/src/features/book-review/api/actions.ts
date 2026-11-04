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

/**
 * 직접 등록 책 강제 삭제 — 테스트로 올린 책처럼 아예 없어야 하는 책을 지운다(HJ, 2026-11-04).
 *
 * 반려는 공개만 막고 기록은 남긴다. 이건 공용 도서와 **그 책을 기록한 모든 사람의
 * 독서 기록**까지 지운다. 기록을 먼저 지우는 이유: 기록이 남아 있으면 사용자가 그
 * 기록을 다시 저장할 때 books 트리거(apply_book_catalog_review)가 카탈로그 행을
 * "검수 대기"로 되살린다. 활동·댓글·좋아요·검수 이력은 FK cascade 로 함께 지워진다.
 * 서점(YES24) 책은 여기서 지우지 않는다 — 다른 사람들의 진짜 기록이 걸려 있다.
 */
export async function deleteCatalogBook(
  _state: ReviewActionState,
  form: FormData
): Promise<ReviewActionState> {
  await assertAdmin();
  const id = String(form.get('id') ?? '');
  if (!uuid.test(id)) return { ok: false, message: '새로고침해 주세요.' };

  const admin = createAdminClient();
  const { data: book, error: findError } = await admin
    .from('global_books')
    .select('id,isbn,source')
    .eq('id', id)
    .maybeSingle();
  if (findError) return { ok: false, message: '책을 확인하지 못했습니다.' };
  if (!book) return { ok: false, message: '이미 삭제된 책이에요.' };
  if (book.source !== 'manual')
    return { ok: false, message: '직접 등록한 책만 삭제할 수 있어요.' };

  const { error: readingsError } = await admin
    .from('books')
    .delete()
    .eq('isbn', book.isbn);
  if (readingsError)
    return { ok: false, message: '독서 기록 삭제에 실패했습니다.' };

  const { error } = await admin.from('global_books').delete().eq('id', id);
  if (error) return { ok: false, message: '도서 삭제에 실패했습니다.' };

  revalidatePath('/admin/books');
  revalidatePath('/books/requests');
  revalidatePath('/books');
  return { ok: true, message: '삭제했어요.' };
}
