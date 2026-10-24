import { toIdentityLabel } from './readerCard';

import type { ReaderShareData } from '../api/getReaderShareData';

/** 운영 주소를 모를 때(로컬·환경 변수 누락) 이미지에 적을 주소 — 이미지는 운영 주소를 말해야 한다 */
const FALLBACK_HOST = 'page0127.com';

/** 이미지에 적을 주소 — 프로토콜·끝 슬래시를 뗀다. localhost 는 운영 주소로 바꾼다 */
export const toStoryAddress = (
  siteUrl: string | undefined,
  username: string
): string => {
  let host = FALLBACK_HOST;
  try {
    const parsed = siteUrl ? new URL(siteUrl).host : '';
    if (parsed && !parsed.startsWith('localhost')) host = parsed;
  } catch {
    // 잘못된 값이면 운영 주소
  }
  return `${host}/${username}`;
};

/**
 * 서재 데이터 → 스토리 카드 칸. 서재 상단 명함과 같은 순서다:
 * 성향이 있으면 성향이 가장 큰 줄이고 이름은 흰 카드에, 없으면 이름이 가장 큰 줄이다.
 */
export const toStoryCardProps = (
  data: ReaderShareData,
  username: string,
  siteUrl: string | undefined
) => {
  const { identity, stat } = data.card;

  return {
    label: identity ? toIdentityLabel(identity) : '공개 서재',
    headline: identity ? identity.name : `${data.displayName}님의 서재`,
    accent: identity?.color ?? null,
    // 가장 큰 줄이 이미 이름이면 흰 카드에 또 쓰지 않는다
    owner: identity ? data.displayName : null,
    stat,
    address: toStoryAddress(siteUrl, username),
    covers: data.covers,
  };
};
