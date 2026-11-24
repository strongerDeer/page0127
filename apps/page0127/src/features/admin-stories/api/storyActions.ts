'use server';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { revalidateStoryPages } from '@/shared/lib/cache/revalidateStoryPages';

import { ensureProviderCatalog } from '@/entities/book/api/ensureProviderCatalog';

import { STORY_IMAGE_BUCKET, validateStoryInput } from '../model/storyForm';

import type { StoryInput } from '../model/storyForm';

/**
 * 책 이야기 저장 (Server Actions) — 어드민 글쓰기 화면이 부른다.
 *
 * 흐름: assertAdmin → 책 확인(없어도 됨) → 값 검사 → stories 에 저장(service role) → 공개 페이지 캐시 버리기.
 * 마지막 단계 덕분에 배포 없이 다음 방문자부터 새 글이 보인다(HJ 2026-11-23 C안).
 *
 * 저장됐는지 화면에 알려 주려고 throw 대신 { ok, message } 를 돌려준다(오늘의 문장과 같은 방식).
 * 권한 없음(assertAdmin)만은 그대로 throw — 화면에서 다룰 상황이 아니다.
 */
export type StoryActionResult =
  { ok: true; id: string } | { ok: false; message: string };

const UUID = /^[0-9a-f-]{36}$/i;

const fail = (message: string): { ok: false; message: string } => ({
  ok: false,
  message,
});

type BookRef = { id: string; title: string; author: string | null };

/**
 * 책을 새로 골랐으면 전체 도서에 넣고(없을 때만) id 를 찾는다. 아니면 연결된 책을 다시 확인한다.
 * 둘 다 없으면 책 없는 글(독서 이야기) — null. 실패는 화면에 보여 줄 문장(string).
 */
async function resolveBook(
  input: StoryInput
): Promise<BookRef | null | string> {
  const supabase = createAdminClient();
  if (input.isbn) {
    try {
      await ensureProviderCatalog(input.isbn);
    } catch (error) {
      return error instanceof Error ? error.message : '책을 확인하지 못했어요.';
    }
    const { data } = await supabase
      .from('global_books')
      .select('id, title, author')
      .eq('isbn', input.isbn)
      .maybeSingle();
    return data ?? '책을 찾지 못했어요. 다시 골라 주세요.';
  }
  if (input.bookId && UUID.test(input.bookId)) {
    const { data } = await supabase
      .from('global_books')
      .select('id, title, author')
      .eq('id', input.bookId)
      .maybeSingle();
    return data ?? '연결된 책을 찾지 못했어요. 책을 다시 골라 주세요.';
  }
  if (input.bookId) return '잘못된 요청입니다.';
  return null;
}

export async function saveStory(input: StoryInput): Promise<StoryActionResult> {
  await assertAdmin();
  if (input.id && !UUID.test(input.id)) return fail('잘못된 요청입니다.');

  const book = await resolveBook(input);
  if (typeof book === 'string') return fail(book);

  const checked = validateStoryInput(
    input,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    book?.title ?? ''
  );
  if (!checked.ok) return fail(checked.message);

  const supabase = createAdminClient();

  // 처음 공개할 때만 날짜를 찍는다 — 공개를 껐다 켜도 글 날짜가 바뀌지 않게
  let publishedAt: string | null = null;
  if (input.id) {
    const { data: existing, error } = await supabase
      .from('stories')
      .select('published_at')
      .eq('id', input.id)
      .maybeSingle();
    if (error || !existing) return fail('고칠 글을 찾지 못했어요.');
    publishedAt = existing.published_at as string | null;
  }
  if (checked.value.is_published && !publishedAt)
    publishedAt = new Date().toISOString();

  const row = {
    ...checked.value,
    // 책 없는 글은 세 칸 모두 비운다 — DB CHECK(stories_book_fields_match)와 같은 규칙
    book_id: book?.id ?? null,
    book_title: book?.title ?? '',
    book_author: book?.author ?? '',
    published_at: publishedAt,
  };

  const query = input.id
    ? supabase
        .from('stories')
        .update(row)
        .eq('id', input.id)
        .select('id')
        .single()
    : supabase.from('stories').insert(row).select('id').single();
  const { data, error } = await query;

  if (error || !data) {
    if (error?.code === '23505')
      return fail('이미 다른 글이 쓰는 주소예요. 주소(영문)를 바꿔 주세요.');
    console.error('[admin] 책 이야기 저장 실패:', error?.message);
    return fail('저장하지 못했어요. 다시 시도해 주세요.');
  }

  revalidateStoryPages();
  return { ok: true, id: data.id as string };
}

export async function deleteStory(id: string): Promise<StoryActionResult> {
  await assertAdmin();
  if (!UUID.test(id)) return fail('잘못된 요청입니다.');
  const { error } = await createAdminClient()
    .from('stories')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[admin] 책 이야기 삭제 실패:', error.message);
    return fail('지우지 못했어요. 다시 시도해 주세요.');
  }
  revalidateStoryPages();
  return { ok: true, id };
}

/** 브라우저가 긴 변 2400px WEBP 로 줄여 보내므로 보통 수백 KB. 버킷 한도와 같다 */
const MAX_STORY_IMAGE_BYTES = 3 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/**
 * 관계도·카드 그림을 올리고 공개 주소를 돌려준다.
 * 버킷에 쓰기 정책을 두지 않고 service role 로만 올린다 — "누가 올릴 수 있나"가 assertAdmin 한 곳에서 정해진다.
 */
export async function uploadStoryImage(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  await assertAdmin();
  const file = formData.get('file');
  if (!(file instanceof File)) return fail('파일이 없습니다.');
  const ext = EXTENSION_BY_TYPE[file.type];
  if (!ext) return fail('PNG·WEBP·JPG 그림만 올릴 수 있어요.');
  if (file.size > MAX_STORY_IMAGE_BYTES)
    return fail('그림이 너무 커요. 3MB 이하로 올려 주세요.');

  const supabase = createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(STORY_IMAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      // 파일 이름이 매번 새로라 내용이 바뀌지 않는다 — 오래 캐시해도 된다
      cacheControl: '31536000',
      upsert: false,
    });
  if (error) {
    console.error('[admin] 책 이야기 그림 업로드 실패:', error.message);
    return fail('그림을 올리지 못했어요. 다시 시도해 주세요.');
  }
  return {
    ok: true,
    url: supabase.storage.from(STORY_IMAGE_BUCKET).getPublicUrl(path).data
      .publicUrl,
  };
}
