export const PROFILE_STORAGE_BUCKET = 'profiles';

/**
 * 프로필 이미지 최대 크기.
 *
 * ⚠️ 앱이 정하고 싶은 값이 아니라 **플랫폼이 정하는 값**이다. Vercel Function 의
 * 요청 body 한도가 4.5MB 라, 그보다 큰 요청은 앱 코드에 닿기도 전에 413
 * (FUNCTION_PAYLOAD_TOO_LARGE)으로 잘린다. 그러면 아래 검사도, 우리가 만든 안내
 * 문구도 실행되지 않고 사용자에겐 "저장 중"이 멈춘 것처럼 보인다.
 * https://vercel.com/docs/functions/limitations#request-body-size
 *
 * 그래서 4MB 로 둔다 — multipart 메타데이터와 나머지 폼 필드까지 더해도 4.5MB
 * 안에 들어와, 한도 초과가 **우리 코드의 에러 메시지로** 처리된다.
 * 클라이언트·서버가 같은 값을 봐야 하므로 여기서 한 번만 정의한다.
 */
export const MAX_PROFILE_IMAGE_BYTES = 4 * 1024 * 1024;

/** 사용자에게 보여줄 한도 표기 (안내 문구·에러 메시지 공용) */
export const MAX_PROFILE_IMAGE_LABEL = '4MB';

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
