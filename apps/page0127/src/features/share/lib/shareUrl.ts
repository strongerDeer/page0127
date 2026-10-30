import {
  SHARE_PARAM,
  SHARE_PARAM_VALUE,
} from '@/shared/lib/analytics/shareTag';

/**
 * 공유할 절대 주소 — `?from=share` 하나만 붙인다 (utm 으로 펼치는 건 받는 쪽 ga-init, shareTag 참고).
 * path 에 이미 쿼리가 있어도 덮지 않고 이어 붙인다.
 */
export const buildShareUrl = (origin: string, path: string): string => {
  const url = new URL(path, origin);
  url.searchParams.set(SHARE_PARAM, SHARE_PARAM_VALUE);
  return url.toString();
};
