/**
 * 공유 링크에 붙이는 꼬리표(UTM) — 받은 사람이 눌러 들어오면 GA 가 "공유로 왔다"를 안다.
 *
 * 왜 utm_source 를 'share' 로 두는가:
 *   보내는 쪽은 사용자가 공유 시트에서 카톡을 골랐는지 인스타를 골랐는지 알 수 없다
 *   (navigator.share 는 고른 앱을 알려 주지 않는다). 대신 **받는 쪽**이 카톡·인스타 앱 안
 *   브라우저로 열면 UA 로 알 수 있어서, GA 로 보내기 직전에 'share' 를 그 앱 이름으로 바꾼다
 *   (GoogleAnalytics 의 ga-init 참고). 앱 밖 브라우저로 열면 'share' 로 남는다.
 *
 * utm_medium 은 'social' — GA 기본 채널 그룹이 'Organic Social' 로 묶는다.
 * ('share' 같은 임의 값은 '분류 안 됨'으로 떨어져 봇 경고와 섞인다.)
 */
export const SHARE_SOURCE = 'share';
export const SHARE_MEDIUM = 'social';
export const SHARE_CAMPAIGN_PREFIX = 'share_';

/** 무엇을 공유했나 — 경로 모양으로 정한다: /아이디 = 서재, /아이디/책id = 책 */
export type ShareKind = 'library' | 'book';

/** 어떻게 공유했나 — 공유 시트(native) 또는 주소 복사(copy) */
export type ShareMethod = 'native' | 'copy';

export const shareKindOf = (path: string): ShareKind =>
  path.split('/').filter(Boolean).length >= 2 ? 'book' : 'library';

/** 공유할 절대 주소. path 에 이미 쿼리가 있어도 덮지 않고 이어 붙인다 */
export const buildShareUrl = (
  origin: string,
  path: string,
  method: ShareMethod
): string => {
  const url = new URL(path, origin);
  url.searchParams.set('utm_source', SHARE_SOURCE);
  url.searchParams.set('utm_medium', SHARE_MEDIUM);
  url.searchParams.set(
    'utm_campaign',
    `${SHARE_CAMPAIGN_PREFIX}${shareKindOf(path)}`
  );
  url.searchParams.set('utm_content', method);
  return url.toString();
};
