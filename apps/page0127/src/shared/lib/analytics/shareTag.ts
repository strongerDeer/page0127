/**
 * 공유 링크 표시 — 공유 링크엔 `?from=share` 하나만 붙이고, GA 로 보낼 때 utm 으로 펼친다.
 *
 * 왜 utm 을 링크에 직접 달지 않는가:
 *   utm 4개를 달면 링크가 `?utm_source=share&utm_medium=social&...` 처럼 길어진다.
 *   공유 시트에서 "복사"를 고르면 이 긴 주소가 그대로 메시지에 들어가 지저분하다.
 *   그래서 링크엔 짧은 표시만 두고, 받는 쪽 브라우저(GoogleAnalytics 의 ga-init)가
 *   GA 로 보내는 page_location 에만 utm 을 채운다 — 어드민 공유 지표는 그대로 잡힌다.
 *
 * utm_source 를 'share' 로 두는 이유:
 *   보내는 쪽은 공유 시트에서 카톡을 골랐는지 인스타를 골랐는지 알 수 없다
 *   (navigator.share 는 고른 앱을 알려 주지 않는다). 대신 **받는 쪽**이 카톡·인스타 앱 안
 *   브라우저로 열면 UA 로 알 수 있어서, ga-init 이 'share' 를 그 앱 이름으로 바꾼다.
 *   앱 밖 브라우저로 열면 'share' 로 남는다.
 *
 * utm_medium 은 'social' — GA 기본 채널 그룹이 'Organic Social' 로 묶는다.
 * ('share' 같은 임의 값은 '분류 안 됨'으로 떨어져 봇 경고와 섞인다.)
 */
export const SHARE_PARAM = 'from';
export const SHARE_PARAM_VALUE = 'share';

export const SHARE_SOURCE = 'share';
export const SHARE_MEDIUM = 'social';
export const SHARE_CAMPAIGN_PREFIX = 'share_';
