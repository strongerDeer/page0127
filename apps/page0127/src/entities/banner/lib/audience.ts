import type { HeroSlideRow } from '../types';

/**
 * 노출 대상 판정.
 *
 * ⚠️ DB 의 `is_slide_visible()` 과 같은 규칙이다. 활성·기간은 RLS 가 이미
 * 걸러 주므로 여기서는 **대상만** 본다 — RLS 에 auth.uid() 를 넣지 않은 이유는
 * 비로그인 캐시와 로그인 캐시가 섞이기 때문이고, 그래서 대상 판정만 앱 몫으로 남는다.
 *
 * 왜 필요한가: 배너 문구는 대상에 따라 참·거짓이 갈린다. "지금 가입하세요"를
 * 이미 가입한 사람에게 보여주면 그 배너는 틀린 말을 하는 것이고, 실제로 눌러도
 * 로그인 페이지를 거쳐 제자리로 돌아온다.
 */
export const isForViewer = (
  audience: HeroSlideRow['audience'],
  isMember: boolean
): boolean => {
  if (audience === 'all') return true;
  if (audience === 'member') return isMember;
  return !isMember; // 'guest'
};

/** 보는 사람에게 맞는 슬라이드만 남긴다 (순서는 그대로) */
export const filterForViewer = <T extends { audience: HeroSlideRow['audience'] }>(
  rows: T[],
  isMember: boolean
): T[] => rows.filter((row) => isForViewer(row.audience, isMember));
