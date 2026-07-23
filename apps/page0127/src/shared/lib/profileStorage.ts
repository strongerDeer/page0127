export const PROFILE_STORAGE_BUCKET = 'profiles';

/**
 * Supabase 프로필 이미지 공개 URL이 현재 사용자 소유 경로인지 확인하고,
 * Storage API에 전달할 객체 경로를 반환한다.
 *
 * 사용자가 profiles.photo_url이나 FormData를 조작해 다른 사용자의 공개 URL을
 * 넣더라도, 프로젝트 origin과 `avatars/{userId}_...` 형식이 모두 일치해야만
 * 삭제할 수 있다.
 */
export function extractOwnedProfileImagePath(
  photoUrl: string,
  userId: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
): string | null {
  if (!supabaseUrl) return null;

  try {
    const url = new URL(photoUrl);
    const expectedOrigin = new URL(supabaseUrl).origin;

    if (url.origin !== expectedOrigin) return null;

    const publicPathPrefix = `/storage/v1/object/public/${PROFILE_STORAGE_BUCKET}/`;
    if (!url.pathname.startsWith(publicPathPrefix)) return null;

    const filePath = decodeURIComponent(
      url.pathname.slice(publicPathPrefix.length)
    );
    const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ownedFilePattern = new RegExp(
      `^avatars/${escapedUserId}_[0-9]+\\.(?:jpg|png|webp|gif)$`,
      'i'
    );

    return ownedFilePattern.test(filePath) ? filePath : null;
  } catch {
    return null;
  }
}
