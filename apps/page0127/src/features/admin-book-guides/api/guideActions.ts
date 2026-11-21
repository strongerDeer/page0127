'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { revalidateBookInfoPages } from '@/shared/lib/cache/revalidateBookInfoPages';

import { bookGuideSectionsSchema } from '@/entities/book-guide';

export type GuideActionResult = { ok: true } | { ok: false; message: string };

const uuid = /^[0-9a-f-]{36}$/i;

/**
 * 읽기 가이드 저장 — 편집기가 만든 sections 를 서버에서 한 번 더 검사하고 저장한다.
 *
 * 왜 서버에서 또 검사하나: 브라우저 검사는 편의일 뿐, 요청은 얼마든지 조작될 수 있다.
 * DB 는 "배열이다" 까지만 막으므로 모양을 지키는 마지막 문은 여기다.
 * 저장 뒤 책 정보 페이지 캐시(ISR 1시간)를 버려서 발행이 바로 보이게 한다.
 */
export async function saveBookGuide(input: {
  globalBookId: string;
  status: 'draft' | 'published';
  sections: unknown;
}): Promise<GuideActionResult> {
  await assertAdmin();
  if (!uuid.test(input.globalBookId)) {
    return { ok: false, message: '책 id가 올바르지 않아요.' };
  }
  if (input.status !== 'draft' && input.status !== 'published') {
    return { ok: false, message: '상태 값이 올바르지 않아요.' };
  }

  const parsed = bookGuideSectionsSchema.safeParse(input.sections);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: `저장하지 못했어요: ${issue.path.join('.')} — ${issue.message}`,
    };
  }

  const { error } = await createAdminClient().from('book_guides').upsert(
    {
      global_book_id: input.globalBookId,
      status: input.status,
      sections: parsed.data,
    },
    { onConflict: 'global_book_id' }
  );
  if (error) {
    console.error('[admin] 읽기 가이드 저장 실패:', error.message);
    return { ok: false, message: '저장하지 못했어요. 다시 시도해 주세요.' };
  }

  revalidateBookInfoPages();
  revalidatePath('/admin/guides');
  return { ok: true };
}
