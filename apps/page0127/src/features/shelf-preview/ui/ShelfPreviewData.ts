import type { LeaderLifeBook } from '../model/leaderLifeBooks';
import type { ShelfPick } from '../model/types';

/** A 는 10권 고르기, B 는 인생책 찾기 — 그룹마다 필요한 책 목록이 다르다 */
export type ShelfPreviewData =
  | { variant: 'a'; picks: ShelfPick[] }
  | { variant: 'b'; leaders: LeaderLifeBook[] };

/**
 * 비로그인 홈 맛보기의 데이터. 화면은 홈 page 가 책의 쪽(home-book Chapter)으로 나눠 그린다 —
 * A: ShelfPreviewProvider 안에 2장 책 고르기·3장 내 책장 / B: LifeBookHero 한 쪽.
 *
 * 책 목록은 여기서 읽지 않고 page 가 첫 화면(셸) 전에 읽어 넘긴다.
 * 왜: 목록은 unstable_cache 로 1시간 캐시하는데, 캐시가 낡으면 Next 가 낡은 값을 주고
 * **배경에서** 다시 읽는다. 그 배경 갱신이 함수가 끝난 뒤에도 돌 수 있게 Vercel waitUntil 에
 * 맡기는 시점은 첫 화면(셸)을 만들 때다. Suspense 안에서 늦게 시작한 갱신은 거기 실리지 않아,
 * 응답이 끝나 함수가 멈추면 요청이 공중에 뜨고 5초 상한에 걸려 [db-timeout] 이 났다
 * (2026-10-23~26 홈에서 이 조회만 반복. 같은 페이지의 getRecentBooks 는 셸 전에 읽어 한 번도 안 났다).
 */
