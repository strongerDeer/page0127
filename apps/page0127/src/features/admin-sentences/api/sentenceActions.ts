'use server';

import { revalidatePath } from 'next/cache';

import { getBookProvider } from '@/shared/api/book-provider';
import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { revalidateBookInfoPages } from '@/shared/lib/cache/revalidateBookInfoPages';

import { ensureProviderCatalog } from '@/entities/book/api/ensureProviderCatalog';

import { fillMissingCovers } from '../model/fillMissingCovers';
import { isRateLimitError, paceCalls, retryOn429 } from '../model/paceCalls';
import { parseSentenceCsv, sentenceKey } from '../model/sentenceCsv';
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

/**
 * 서점 오류를 남긴다 — 429(잠깐 막힘)는 다시 눌러 풀리는 일이라 경고로만 남긴다.
 * error 로 남기면 운영 알림(카톡)이 울린다(2026-11-18 표지 채우기 때 27건).
 */
const logProviderFailure = (label: string, isbn: string, error: unknown) => {
  if (isRateLimitError(error))
    console.warn(
      `[admin] ${label} — YES24 429, 다시 누르면 이어서 채워요:`,
      isbn
    );
  else console.error(`[admin] ${label}:`, isbn, error);
};

/** 서점(YES24)에서 ISBN 으로 표지 주소를 찾는다. 429 면 쉬었다 다시, 그래도 안 되면 null */
const lookupCover = async (isbn: string): Promise<string | null> => {
  try {
    return (
      (await retryOn429(() => getBookProvider().getByIsbn(isbn)))?.coverImage ||
      null
    );
  } catch (error) {
    logProviderFailure('문장 표지 찾기 실패', isbn, error);
    return null;
  }
};

export type SentenceImportResult =
  | {
      ok: true;
      inserted: number;
      /** ISBN 으로 표지를 찾아 채운 수 */
      covers: number;
      /** 풀에 이미 있던 문장이라 건너뛴 수 */
      skipped: number;
      /** 검사에 걸려 못 넣은 줄 수 */
      invalid: number;
    }
  | { ok: false; message: string };

/**
 * CSV 한 번에 올리기 (HJ, 2026-11-18) — 화면이 미리 읽어 보여 준 것과 별개로 서버가 다시 읽는다.
 * 브라우저가 보낸 값은 믿지 않는다: 같은 검사기(parseSentenceCsv → parseSentenceForm)를 다시 거친다.
 *
 * 이미 풀에 있는 문장(띄어쓰기 차이 무시)은 건너뛴다 — 같은 파일을 두 번 올려도 겹치지 않게.
 * 넣는 문장은 바로 활성이다. 한 번의 insert 로 넣어서, 실패하면 하나도 들어가지 않는다.
 */
export async function importSentences(
  csvText: string
): Promise<SentenceImportResult> {
  await assertAdmin();
  if (typeof csvText !== 'string' || csvText.length > 900_000)
    return { ok: false, message: '파일이 너무 커요.' };

  const parsed = parseSentenceCsv(csvText);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  if (parsed.rows.length === 0)
    return { ok: false, message: '넣을 수 있는 문장이 없어요.' };

  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from('daily_sentences')
    .select('text');
  if (readError) {
    console.error('[admin] 문장 목록 조회 실패:', readError.message);
    return { ok: false, message: '지금 있는 문장을 확인하지 못했어요.' };
  }
  const known = new Set((existing ?? []).map((row) => sentenceKey(row.text)));
  const fresh = parsed.rows.filter((row) => !known.has(sentenceKey(row.text)));

  // 표지가 빈 줄은 ISBN 으로 서점 표지를 찾아 채운다(새로 넣을 줄만 — 조회 수를 아낀다)
  const { rows: toInsert, filled } = await fillMissingCovers(
    fresh,
    lookupCover
  );

  if (toInsert.length > 0) {
    const { error } = await admin.from('daily_sentences').insert(toInsert);
    if (error) {
      console.error('[admin] 문장 일괄 저장 실패:', error.message);
      return {
        ok: false,
        message: '문장을 넣지 못했어요. 하나도 저장되지 않았어요.',
      };
    }
    revalidate();
    // 문장의 책을 전체 도서에도 넣어 "이 책 보러 가기"가 도서 정보로 가게 한다(HJ, 2026-11-18)
    await addBooksToCatalog(toInsert.map((row) => row.isbn));
  }

  return {
    ok: true,
    inserted: toInsert.length,
    covers: filled,
    skipped: parsed.rows.length - fresh.length,
    invalid: parsed.errors.length,
  };
}

export type FillCoversResult =
  | { ok: true; filled: number; missing: number }
  | { ok: false; message: string };

/**
 * 이미 풀에 있는 문장 중 표지가 빈 것을 ISBN 으로 한 번에 채운다 (HJ, 2026-11-18).
 * CSV 를 표지 자동 채우기 전에 올렸거나, 하나씩 넣을 때 표지를 안 고른 문장용.
 * 같은 책(ISBN)의 문장은 한 번의 update 로 묶는다.
 */
export async function fillSentenceCovers(): Promise<FillCoversResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('daily_sentences')
    .select('id, isbn, cover_image')
    .is('cover_image', null)
    .not('isbn', 'is', null);
  if (error) {
    console.error('[admin] 표지 빈 문장 조회 실패:', error.message);
    return { ok: false, message: '표지가 빈 문장을 찾지 못했어요.' };
  }
  const rows = (data ?? []) as {
    id: string;
    isbn: string | null;
    cover_image: string | null;
  }[];
  if (rows.length === 0) return { ok: true, filled: 0, missing: 0 };

  const { rows: next } = await fillMissingCovers(rows, lookupCover);

  // 표지 주소별로 id 를 모아 한 번씩만 update 한다
  const byCover = new Map<string, string[]>();
  for (const row of next) {
    if (!row.cover_image) continue;
    byCover.set(row.cover_image, [
      ...(byCover.get(row.cover_image) ?? []),
      row.id,
    ]);
  }

  let filled = 0;
  for (const [cover, ids] of byCover) {
    const { error: updateError } = await admin
      .from('daily_sentences')
      .update({ cover_image: cover })
      .in('id', ids)
      .is('cover_image', null);
    if (updateError) {
      console.error('[admin] 문장 표지 저장 실패:', updateError.message);
      continue;
    }
    filled += ids.length;
  }

  if (filled > 0) revalidate();
  return { ok: true, filled, missing: rows.length - filled };
}

/**
 * ISBN 들을 전체 도서(global_books)에 넣는다 — 이미 있으면 건너뛴다.
 * 사용자가 책을 담을 때와 같은 ensureProviderCatalog(서점 원본 서지·승인 상태)를 쓴다.
 * 여기는 서재 책이 없어 책등을 따로 채울 길이 없으므로 withSpine 으로 책등도 함께 확인한다.
 * 서점을 천천히 부르고(paceCalls), 429 면 쉬었다 다시 묻는다(retryOn429).
 * 못 찾은 ISBN 은 실패로 세고 넘어간다(문장은 그대로 "담기" 화면으로 이어진다).
 */
const addBooksToCatalog = async (
  isbns: (string | null)[]
): Promise<{ done: number; failed: number }> => {
  const unique = [...new Set(isbns.filter((v): v is string => !!v))];
  const results = await paceCalls(unique, (isbn) =>
    retryOn429(() => ensureProviderCatalog(isbn, { withSpine: true }))
  );
  let done = 0;
  let failed = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') done += 1;
    else {
      failed += 1;
      logProviderFailure(
        '문장 책 전체 도서 등록 실패',
        unique[index],
        result.reason
      );
    }
  });
  if (done > 0) revalidateBookInfoPages();
  return { done, failed };
};

export type CatalogSyncResult =
  { ok: true; books: number; failed: number } | { ok: false; message: string };

/**
 * 풀에 있는 문장의 책을 전체 도서에 한 번에 넣는다 (HJ, 2026-11-18 B안).
 * 넣고 나면 오늘의 문장 "이 책 보러 가기"가 도서 정보 화면으로 간다.
 * 이미 있는 책은 건너뛰므로 여러 번 눌러도 안전하다.
 */
export async function addSentenceBooksToCatalog(): Promise<CatalogSyncResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('daily_sentences')
    .select('isbn')
    .not('isbn', 'is', null);
  if (error) {
    console.error('[admin] 문장 ISBN 조회 실패:', error.message);
    return { ok: false, message: '문장의 책 목록을 읽지 못했어요.' };
  }
  const { done, failed } = await addBooksToCatalog(
    (data ?? []).map((row) => row.isbn as string | null)
  );
  return { ok: true, books: done, failed };
}
