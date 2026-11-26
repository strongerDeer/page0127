/**
 * 필사 기록을 낸 기기 — 순위표에 "모바일" 표시를 붙이는 데만 쓴다(HJ 2026-11-26 "표시만").
 *
 * 화면이 보내는 값 대신 서버가 받은 요청 헤더로 정한다. 크롬 계열은 Sec-CH-UA-Mobile(?1/?0)을
 * 보내 주고, 사파리 등은 User-Agent 로 본다. 일부러 조작하지 않는 한 바뀌지 않는다.
 * (iPadOS 사파리는 Mac 으로 자신을 소개하므로 PC 로 잡힌다 — 키보드를 붙여 쓰는 경우가 많아 그대로 둔다)
 */
export type TypingDevice = 'pc' | 'mobile';

const MOBILE_UA = /Mobi|Android|iPhone|iPod/i;

export const deviceFromHeaders = (
  get: (name: string) => string | null
): TypingDevice => {
  const hint = get('sec-ch-ua-mobile');
  if (hint === '?1') return 'mobile';
  if (hint === '?0') return 'pc';
  return MOBILE_UA.test(get('user-agent') ?? '') ? 'mobile' : 'pc';
};
