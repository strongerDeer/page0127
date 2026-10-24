import { READER_STAT_MIN_BOOKS, toIdentityLabel } from './readerCard';
import { toStoryShelf } from './storyShelf';

import type { ReaderShareData } from '../api/getReaderShareData';
import type { StoryCardProps } from '@/shared/lib/og/StoryCard';

/** 운영 주소를 모를 때(로컬·환경 변수 누락) 이미지에 적을 주소 — 이미지는 운영 주소를 말해야 한다 */
const FALLBACK_HOST = 'page0127.com';

/** 성향 이름 아래 태그 수 — 한 줄에 들어가는 만큼 */
const STORY_TOPIC_LIMIT = 3;

/** 성향이 없을 때 가장 큰 줄 — 이름은 위 프로필 줄이 이미 말한다 */
const STORY_SLOGAN = '책장을 보면, 그 사람이 보인다.';

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
 * 서재 데이터 → 스토리 카드 칸.
 *
 * 숫자는 권수 하나만 크게 — 명함의 숫자 한 줄(toReaderCard)과 같은 규칙이다:
 * 올해 3권 이상이면 올해, 아니면 전체 3권 이상, 아니면 숫자 없음.
 * 책장은 그 숫자와 같은 책을 세운다(올해 숫자면 올해 책).
 */
export const toStoryCardProps = (
  data: ReaderShareData,
  username: string,
  siteUrl: string | undefined
): StoryCardProps => {
  const { identity } = data.card;
  const onlyThisYear = data.yearBooks >= READER_STAT_MIN_BOOKS;

  const count: StoryCardProps['count'] = onlyThisYear
    ? { label: `${data.year}년에 완독한 책`, value: data.yearBooks }
    : data.totalBooks >= READER_STAT_MIN_BOOKS
      ? { label: '지금까지 꽂은 책', value: data.totalBooks }
      : null;

  return {
    photoUrl: data.photoUrl,
    name: data.displayName,
    address: toStoryAddress(siteUrl, username),
    label: identity ? toIdentityLabel(identity) : null,
    headline: identity?.name ?? STORY_SLOGAN,
    accent: identity?.color ?? null,
    // 주제 태그는 AI 분석의 것 — 첫인상은 분류 하나로 본 것이라 태그가 없다
    topics:
      identity?.source === 'analysis'
        ? data.topics.slice(0, STORY_TOPIC_LIMIT)
        : [],
    shelf: toStoryShelf(data.books, { year: data.year, onlyThisYear }),
    covers: data.covers,
    count,
  };
};
