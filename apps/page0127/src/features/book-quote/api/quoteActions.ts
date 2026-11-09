'use server';

import { createClient } from '@/shared/config/supabase/server';

import { parseQuoteInput } from '@/entities/quote';

import { QUOTE_DRAFTS_MAX } from '../model/quoteDrafts';

import type { QuoteDraftInput } from '../model/quoteDrafts';

/**
 * 책 문장 추가·수정·삭제 (Server Actions)
 *
 * - 사용자 ID 는 클라이언트에서 받지 않고 쿠키 세션으로 확인한다.
 * - 입력 검사는 폼과 같은 parseQuoteInput 을 서버에서 한 번 더 — 폼을 우회해도 막힌다.
 *   그 뒤에 DB CHECK·RLS 가 마지막으로 지킨다(다층 방어).
 * - 화면 갱신은 부르는 쪽이 router.refresh() 로 한다. 책 상세 주소(/아이디/책ID)를
 *   액션이 알 필요가 없게 하기 위해서다.
 */
export type QuoteActionResult = { ok: true } | { ok: false; message: string };

const uuid = /^[0-9a-f-]{36}$/i;

const requireUser = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
};

export const addQuoteAction = async (
  form: FormData
): Promise<QuoteActionResult> => {
  const parsed = parseQuoteInput(form.get('text'), form.get('page'));
  if (!parsed.ok) return parsed;

  const isbn = String(form.get('isbn') ?? '').trim();
  if (!isbn) return { ok: false, message: '새로고침 후 다시 시도해 주세요.' };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: '로그인이 필요합니다.' };

  // 내 서재에 있는 책에만 적는다 — 아무 ISBN 에나 문장을 쌓지 않도록
  const { count } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('isbn', isbn);
  if (!count) return { ok: false, message: '내 서재에 있는 책이 아니에요.' };

  const { error } = await supabase.from('book_quotes').insert({
    user_id: user.id,
    isbn,
    text: parsed.value.text,
    page: parsed.value.page,
  });
  if (error) {
    console.error('책 문장 저장 실패:', error.message);
    return { ok: false, message: '문장을 저장하지 못했어요.' };
  }
  return { ok: true };
};

export const updateQuoteAction = async (
  form: FormData
): Promise<QuoteActionResult> => {
  const id = String(form.get('id') ?? '');
  if (!uuid.test(id))
    return { ok: false, message: '새로고침 후 다시 시도해 주세요.' };

  const parsed = parseQuoteInput(form.get('text'), form.get('page'));
  if (!parsed.ok) return parsed;

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: '로그인이 필요합니다.' };

  const { data, error } = await supabase
    .from('book_quotes')
    .update({
      text: parsed.value.text,
      page: parsed.value.page,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    if (error) console.error('책 문장 수정 실패:', error.message);
    return { ok: false, message: '문장을 고치지 못했어요.' };
  }
  return { ok: true };
};

export const deleteQuoteAction = async (
  id: string
): Promise<QuoteActionResult> => {
  if (!uuid.test(id))
    return { ok: false, message: '새로고침 후 다시 시도해 주세요.' };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('book_quotes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    console.error('책 문장 삭제 실패:', error.message);
    return { ok: false, message: '문장을 지우지 못했어요.' };
  }
  return { ok: true };
};

/**
 * 도서 등록과 함께 적은 문장들을 한 번에 저장한다.
 *
 * 등록 화면이 책을 저장한 "다음에" 부른다 — 문장은 내 서재에 있는 책에만 붙기 때문이다.
 * 하나라도 규칙에 어긋나면 아무것도 저장하지 않는다(일부만 들어가면 무엇이 빠졌는지 헷갈린다).
 * 빈 칸은 실수로 남긴 줄로 보고 건너뛴다.
 */
export const addQuotesAction = async (
  isbn: string,
  drafts: QuoteDraftInput[]
): Promise<QuoteActionResult & { saved?: number }> => {
  const filled = drafts.filter((draft) => draft.text.trim());
  if (filled.length === 0) return { ok: true, saved: 0 };
  if (filled.length > QUOTE_DRAFTS_MAX)
    return {
      ok: false,
      message: `문장은 한 번에 ${QUOTE_DRAFTS_MAX}개까지 적을 수 있어요.`,
    };

  const rows: { text: string; page: number | null }[] = [];
  for (const draft of filled) {
    const parsed = parseQuoteInput(draft.text, draft.page);
    if (!parsed.ok) return parsed;
    rows.push(parsed.value);
  }

  const trimmedIsbn = isbn.trim();
  if (!trimmedIsbn)
    return { ok: false, message: '새로고침 후 다시 시도해 주세요.' };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: '로그인이 필요합니다.' };

  const { count } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('isbn', trimmedIsbn);
  if (!count) return { ok: false, message: '내 서재에 있는 책이 아니에요.' };

  const { error } = await supabase.from('book_quotes').insert(
    rows.map((row) => ({
      user_id: user.id,
      isbn: trimmedIsbn,
      text: row.text,
      page: row.page,
    }))
  );
  if (error) {
    console.error('책 문장 일괄 저장 실패:', error.message);
    return { ok: false, message: '문장을 저장하지 못했어요.' };
  }
  return { ok: true, saved: rows.length };
};
