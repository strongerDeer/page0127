'use server';

import { createClient } from '@/shared/config/supabase/server';

// 아바타가 저장되는 Supabase Storage 버킷
const BUCKET = 'profiles';

// 서버 Supabase 클라이언트 타입 (any 없이 createClient 반환값에서 추론)
type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * useActionState가 관리할 프로필 폼 상태
 * - status로 성공/실패 구분 → 클라이언트 toast 분기에 사용
 * - photoUrl: 성공 시 갱신된 이미지 URL (undefined면 이미지 변경 없음)
 *   → 클라이언트 미리보기를 서버 결과와 동기화할 때 쓴다
 */
export type ProfileActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  photoUrl?: string | null;
};

/**
 * Storage URL에서 버킷 이후 파일 경로 추출
 * (기존 useAvatarStorage의 클라이언트 로직을 서버로 이동)
 */
const extractFilePath = (url: string): string | null => {
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
};

// 기존 이미지를 Storage에서 삭제 (URL이 없거나 경로 파싱 실패 시 조용히 통과)
const deleteFromStorage = async (
  supabase: ServerSupabase,
  url: string | null
): Promise<void> => {
  if (!url) return;
  const filePath = extractFilePath(url);
  if (!filePath) return;
  await supabase.storage.from(BUCKET).remove([filePath]);
};

/**
 * 프로필 업데이트 (Server Action)
 *
 * 학습 포인트:
 * - 기존 updateProfile(클라이언트) + useAvatarStorage(클라이언트)를 서버로 통합
 * - useActionState 시그니처: (이전 상태, FormData) => 다음 상태
 * - 텍스트(nickname/bio) + 파일(avatar)을 FormData 하나로 함께 수집
 * - 인증·유효성 검사를 서버에서 → 클라이언트 우회가 불가능한 신뢰 검증
 *
 * ⚠️ 트레이드오프 (실무 메모):
 * - 파일을 Server Action으로 보내면 File이 Next.js 서버 메모리를 경유한다.
 *   (기존엔 클라이언트가 Supabase Storage로 직접 업로드 → 서버 부하 없음)
 * - 실무에선 "파일은 클라이언트 직접 업로드, URL만 Action 전달" 하이브리드도 흔하다.
 *   여기선 학습을 위해 인증·검증을 일원화하려 전체를 서버로 모은다.
 */
export const updateProfileAction = async (
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> => {
  const supabase = await createClient();

  // 1. 인증 — 클라이언트가 보낸 id를 믿지 않고 쿠키로 현재 로그인 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.' };
  }

  // 2. 텍스트 필드 수집 (FormData 값은 항상 문자열)
  const nickname = ((formData.get('nickname') as string) ?? '').trim();
  const bio = ((formData.get('bio') as string) ?? '').trim();

  // 3. 아바타 입력 수집
  // - avatar: 새로 선택한 파일 (없으면 size 0인 빈 File 또는 null)
  // - removeAvatar: '이미지 제거'를 눌렀는지 여부
  // - currentPhotoUrl: 기존 이미지 URL (삭제·교체 시 정리용)
  const avatarFile = formData.get('avatar') as File | null;
  const isImageRemoved = formData.get('removeAvatar') === 'true';
  const currentPhotoUrl = (formData.get('currentPhotoUrl') as string) || null;

  // photoUrl: undefined = 변경 없음 / null = 제거 / string = 새 이미지 URL
  let photoUrl: string | null | undefined;

  try {
    if (isImageRemoved) {
      await deleteFromStorage(supabase, currentPhotoUrl);
      photoUrl = null;
    } else if (avatarFile && avatarFile.size > 0) {
      // 서버 유효성 검사 (클라이언트 검사를 신뢰하지 않고 다시 확인)
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(avatarFile.type)) {
        return { status: 'error', message: '지원하지 않는 이미지 형식입니다.' };
      }
      if (avatarFile.size > 5 * 1024 * 1024) {
        return {
          status: 'error',
          message: '이미지 크기는 5MB 이하여야 합니다.',
        };
      }

      // 기존 이미지 삭제 후 새 파일 업로드
      await deleteFromStorage(supabase, currentPhotoUrl);
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `avatars/${user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, avatarFile, { cacheControl: '3600', upsert: false });
      if (uploadError) {
        return { status: 'error', message: '이미지 업로드에 실패했습니다.' };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      photoUrl = publicUrl;
    }
  } catch (error) {
    console.error('아바타 처리 실패:', error);
    return { status: 'error', message: '이미지 처리 중 오류가 발생했습니다.' };
  }

  // 4. DB 업데이트
  // 빈 문자열은 보내지 않아 기존 값을 유지(= 기존 updateProfile 동작 보존),
  // photoUrl이 undefined면 photo_url 컬럼은 건드리지 않는다.
  const updateData: {
    nickname?: string;
    bio?: string;
    photo_url?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (nickname) updateData.nickname = nickname;
  if (bio) updateData.bio = bio;
  if (photoUrl !== undefined) updateData.photo_url = photoUrl;

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) {
    console.error('프로필 업데이트 실패:', error.message);
    return { status: 'error', message: '프로필 저장에 실패했습니다.' };
  }

  return {
    status: 'success',
    message: '프로필이 저장되었습니다.',
    photoUrl,
  };
};
