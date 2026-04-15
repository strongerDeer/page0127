'use client';

import { createClient } from '@/shared/config/supabase/client';

const BUCKET = 'profiles';

// Supabase Storage URL에서 버킷 이후 파일 경로 추출
function extractFilePath(url: string): string | null {
  const patterns = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/object/public/${BUCKET}/`,
    `/${BUCKET}/`,
  ];
  for (const pattern of patterns) {
    if (url.includes(pattern)) {
      const parts = url.split(pattern);
      return parts.length > 1 ? parts[1] : null;
    }
  }
  return null;
}

async function deleteFromStorage(url: string | null): Promise<void> {
  if (!url) return;
  const filePath = extractFilePath(url);
  if (!filePath) return;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) {
    throw new Error(`Storage 삭제 실패: ${error.message}`);
  }
}

/**
 * 프로필 아바타 Storage 훅
 *
 * 학습 포인트:
 * - Supabase Storage 업로드/삭제 로직을 컴포넌트에서 분리
 * - URL 파싱 로직을 한 곳에서 관리 (중복 제거)
 */
export const useAvatarStorage = () => {
  const uploadAvatar = async (
    file: File,
    userId: string,
    currentPhotoUrl: string | null
  ): Promise<string> => {
    const supabase = createClient();

    // 기존 이미지 삭제
    await deleteFromStorage(currentPhotoUrl);

    // 파일명: userId + timestamp + 확장자
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${userId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    return publicUrl;
  };

  const removeAvatar = async (currentPhotoUrl: string | null): Promise<void> => {
    await deleteFromStorage(currentPhotoUrl);
  };

  return { uploadAvatar, removeAvatar };
};
