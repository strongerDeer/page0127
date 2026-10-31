'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function revalidate() {
  revalidatePath('/admin');
  revalidatePath('/admin/analytics');
}

/** 운영 기록 추가 — 폼(action)에서 바로 부른다 */
export async function createAdminEvent(formData: FormData): Promise<void> {
  await assertAdmin();
  const date = String(formData.get('date') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (!DATE_RE.test(date) || !title) return;

  const { error } = await createAdminClient()
    .from('admin_events')
    .insert({
      event_date: date,
      title: title.slice(0, 100),
      note: note ? note.slice(0, 500) : null,
    });
  if (error) throw new Error(`운영 기록 저장 실패: ${error.message}`);
  revalidate();
}

export async function deleteAdminEvent(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { error } = await createAdminClient()
    .from('admin_events')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`운영 기록 삭제 실패: ${error.message}`);
  revalidate();
}
