/**
 * 저장된 출처 → 사람이 읽는 채널 이름. 읽을 때 분류해서, 규칙을 고쳐도 옛 기록까지 새 규칙으로 보인다.
 */
export type SignupChannel =
  | '인스타그램'
  | '스레드'
  | '페이스북'
  | '카카오톡'
  | '네이버'
  | '구글'
  | '다음'
  | 'Bing'
  | '공유 링크'
  | '직접 방문'
  | '기타 사이트'
  | '기록 없음';

export type AttributionLike = {
  source: string;
  medium: string | null;
  referrer_host?: string | null;
} | null;

const BY_SOURCE: [RegExp, SignupChannel][] = [
  [/^(ig|instagram)/, '인스타그램'],
  [/^threads/, '스레드'],
  [/^(fb|facebook)/, '페이스북'],
  [/^(kakao|kakaotalk)/, '카카오톡'],
  [/^naver/, '네이버'],
  [/^google/, '구글'],
  [/^daum/, '다음'],
  [/^bing/, 'Bing'],
  [/^share$/, '공유 링크'],
  [/^direct$/, '직접 방문'],
];

// 도메인으로 들어온 경우(referral) — 하위 도메인까지(l.instagram.com, search.naver.com, m.search.daum.net)
const BY_HOST: [RegExp, SignupChannel][] = [
  [/(^|\.)instagram\.com$/, '인스타그램'],
  [/(^|\.)threads\.(net|com)$/, '스레드'],
  [/(^|\.)(facebook\.com|fb\.me)$/, '페이스북'],
  [/(^|\.)kakao\.com$/, '카카오톡'],
  [/(^|\.)naver\.(com|me)$/, '네이버'],
  [/(^|\.)google\.[a-z.]+$/, '구글'],
  [/(^|\.)daum\.net$/, '다음'],
  [/(^|\.)bing\.com$/, 'Bing'],
];

export const toSignupChannel = (a: AttributionLike): SignupChannel => {
  if (!a) return '기록 없음';
  const source = a.source.toLowerCase();
  for (const [re, ch] of BY_SOURCE) if (re.test(source)) return ch;
  const host = (a.referrer_host ?? source).toLowerCase();
  for (const [re, ch] of BY_HOST) if (re.test(host)) return ch;
  return '기타 사이트';
};

/** 회원 목록 한 칸 — "인스타그램", "기타 사이트 (brunch.co.kr)" */
export const signupChannelLabel = (a: AttributionLike): string => {
  const ch = toSignupChannel(a);
  if (ch === '기타 사이트' && a) return `기타 (${a.referrer_host ?? a.source})`;
  return ch;
};
