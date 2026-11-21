'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { revalidateBookInfoPages } from '@/shared/lib/cache/revalidateBookInfoPages';

import { bookGuideSectionsSchema } from '@/entities/book-guide';

import type { BookGuideSection } from '@/entities/book-guide';

export type GuideActionResult = { ok: true } | { ok: false; message: string };

const uuid = /^[0-9a-f-]{36}$/i;

/**
 * 배경 그림은 홈 배너 그림과 같은 공개 버킷(banner-art)의 guide/ 폴더에 둔다.
 * 새 버킷을 만들면 마이그레이션·운영 push 가 따로 필요해서, 한도(1MB·PNG/WEBP/JPG)가 같은 버킷을 같이 쓴다.
 */
const GUIDE_ART_BUCKET = 'banner-art';
const GUIDE_ART_FOLDER = 'guide';
const MAX_GUIDE_ART_BYTES = 1024 * 1024;
const ART_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

const guideArtPrefix = () => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base
    ? `${base}/storage/v1/object/public/${GUIDE_ART_BUCKET}/${GUIDE_ART_FOLDER}/`
    : null;
};

/** 아무 외부 주소나 책 정보 페이지에 뜨지 않게 — 이 화면에서 올린 그림만 받는다 */
const findForeignImage = (sections: BookGuideSection[]): string | null => {
  const prefix = guideArtPrefix();
  for (const section of sections) {
    if (section.type !== 'people') continue;
    const image = section.canvas?.background?.image;
    if (image && (!prefix || !image.startsWith(prefix))) return section.title;
  }
  return null;
};

/**
 * 관계도 배경 그림을 올리고 공개 주소를 돌려준다(저장은 따로 — 주소만 편집 중인 데이터에 담긴다).
 * 브라우저가 1760px(880 캔버스의 2배) WEBP 로 줄여 보내므로 보통 수백 KB.
 */
export async function uploadGuideArt(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  await assertAdmin();
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: '파일이 없어요.' };
  const ext = ART_EXTENSION_BY_TYPE[file.type];
  if (!ext) {
    return { ok: false, message: 'PNG·WEBP·JPG 그림만 올릴 수 있어요.' };
  }
  if (file.size > MAX_GUIDE_ART_BYTES) {
    return { ok: false, message: '그림이 너무 커요. 1MB 이하로 올려 주세요.' };
  }

  const supabase = createAdminClient();
  const path = `${GUIDE_ART_FOLDER}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(GUIDE_ART_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      // 파일 이름이 매번 새로라 내용이 바뀌지 않는다 — 오래 캐시해도 된다
      cacheControl: '31536000',
      upsert: false,
    });
  if (error) {
    console.error('[admin] 가이드 그림 업로드 실패:', error.message);
    return {
      ok: false,
      message: '그림을 올리지 못했어요. 다시 시도해 주세요.',
    };
  }
  return {
    ok: true,
    url: supabase.storage.from(GUIDE_ART_BUCKET).getPublicUrl(path).data
      .publicUrl,
  };
}

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

  const foreign = findForeignImage(parsed.data);
  if (foreign) {
    return {
      ok: false,
      message: `"${foreign}" 배경 그림은 이 화면에서 올린 파일만 쓸 수 있어요.`,
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
