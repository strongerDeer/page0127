import { createClient } from '@/shared/config/supabase/client';
import { resizeAvatarFile } from '@/shared/lib/resizeAvatar';

/**
 * 직접 등록 책의 표지 사진을 올리고 공개 주소를 돌려준다. **브라우저 전용**.
 *
 * 왜 서버 액션이 아니라 브라우저에서 바로 올리나:
 * 책 등록은 브라우저가 Supabase 에 바로 쓰는 흐름(useBookCRUD)이라, 파일만 서버를
 * 거치게 하면 Vercel 요청 4.5MB 한도·함수 시간만 늘어난다. 권한은 Storage 정책이
 * 지킨다 — manual/{내 uid}/ 폴더에만 올라가고, 카탈로그 트리거가 "제출자 본인이 올린
 * 파일"인지 다시 확인한다(20261101000100_manual_book_cover_upload.sql).
 *
 * 경로 규칙(정책·트리거와 같아야 한다): manual/{uid}/{uuid}.{webp|jpg|png}
 */

export const MANUAL_COVER_BUCKET = 'book-covers';

/** 상세 화면에서 가장 크게 나올 때도 400px 안팎이다. 레티나 2배 + 여유. */
export const MANUAL_COVER_MAX_EDGE = 1000;

/** 줄인 뒤에도 이보다 크면(리사이즈 실패 등) 받지 않는다. */
export const MAX_MANUAL_COVER_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** 고르자마자 알려 줄 수 있는 문제. 없으면 null. */
export const checkManualCoverFile = (file: File): string | null => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif')
    return 'JPG·PNG·WEBP 사진만 올릴 수 있어요.';
  return null;
};

export const uploadManualCover = async (file: File): Promise<string> => {
  const problem = checkManualCoverFile(file);
  if (problem) throw new Error(problem);

  // 리사이즈는 실패해도 원본을 돌려준다 — 그래서 형식·크기를 한 번 더 본다
  const resized = await resizeAvatarFile(file, {
    maxEdge: MANUAL_COVER_MAX_EDGE,
    name: 'cover.webp',
  });
  const ext = EXTENSION_BY_TYPE[resized.type];
  if (!ext) throw new Error('JPG·PNG·WEBP 사진만 올릴 수 있어요.');
  if (resized.size > MAX_MANUAL_COVER_BYTES)
    throw new Error('사진이 너무 커요. 5MB 이하로 올려 주세요.');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요.');

  const path = `manual/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(MANUAL_COVER_BUCKET)
    .upload(path, resized, {
      contentType: resized.type,
      // 파일 이름이 매번 새 uuid 라 내용이 바뀔 일이 없다 — 오래 캐시해도 된다
      cacheControl: '31536000',
      upsert: false,
    });
  if (error) throw new Error('표지 사진을 올리지 못했어요.');

  return supabase.storage.from(MANUAL_COVER_BUCKET).getPublicUrl(path).data
    .publicUrl;
};
