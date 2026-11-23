import type { Profile } from '../types';
import type { Metadata } from 'next';

/**
 * 서재를 검색엔진에 노출하는가 — 기본은 노출(블로그와 같은 기대, HJ C안 2026-11-23).
 *
 * `!== false` 로 보는 이유: 값이 없는 경우(칸 추가 전 캐시, 테스트 목 데이터)는
 * DB 기본값(true)을 따른다. 사용자가 **직접 끈 경우에만** 숨긴다.
 */
export const isSearchIndexable = (
  profile: Pick<Profile, 'search_indexable'>
): boolean => profile.search_indexable !== false;

/**
 * 서재와 하위 페이지(배지·문장·책 기록) generateMetadata 에 펼쳐 넣는다.
 *
 * noindex, **follow**: 이 페이지는 검색 결과에 올리지 말되, 안의 링크(책 정보 등)는 따라가도 된다.
 * robots.txt 로 막지 않는 이유 — 막으면 검색엔진이 페이지를 못 읽어 이 noindex 도 못 보고,
 * 바깥 링크만으로 주소가 색인될 수 있다.
 */
export const libraryRobots = (
  profile: Pick<Profile, 'search_indexable'>
): Pick<Metadata, 'robots'> =>
  isSearchIndexable(profile) ? {} : { robots: { index: false, follow: true } };
