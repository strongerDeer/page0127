import { getPublishedStories } from '@/entities/story/server';

import { CHANGELOG } from '@/widgets/landing/model/siteInfo';

import {
  changelogToStamps,
  mergeStamps,
  storiesToStamps,
} from '../model/newsStamps';

import type { NewsStamp } from '../model/newsStamps';

import 'server-only';

/**
 * 셸(상단 바·서재 카드)에 내려보낼 최근 소식 — 레이아웃이 한 번 읽어 넘긴다.
 *
 * DB 를 새로 부르지 않는다: 책 이야기 목록은 /blog·책 정보 카드·사이트맵이 이미 함께 쓰는
 * unstable_cache 한 벌(하루, 어드민 저장 때 태그로 지움)을 그대로 읽는다.
 * 그래서 페이지마다 서버 일을 늘리지 않는다(2026-11 Vercel CPU 한도 참고).
 *
 * 책 이야기를 못 읽어도 상단 바가 깨지면 안 되므로 공지만으로 돌려준다.
 */
export const getNewsStamps = async (): Promise<NewsStamp[]> => {
  const updates = changelogToStamps(CHANGELOG);
  try {
    const stories = storiesToStamps(await getPublishedStories());
    return mergeStamps(updates, stories);
  } catch (error) {
    console.warn(
      '[news] 책 이야기 소식 조회 실패 — 공지만 표시:',
      error instanceof Error ? error.message : error
    );
    return updates;
  }
};
