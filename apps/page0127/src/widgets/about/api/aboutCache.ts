import { unstable_cache } from 'next/cache';

import 'server-only';

/** 소개 페이지 데이터(표지·랭킹·통계)를 새로 가져오는 주기 */
export const ABOUT_REVALIDATE_SECONDS = 3600;

/**
 * 소개 페이지 조회를 1시간 캐시한다 — 성공한 결과만.
 *
 * 왜 페이지 단위 revalidate 로는 안 되나: (public) 레이아웃이 cookies() 를 읽어
 * 로그인 상태를 확인하므로 이 페이지는 요청마다 새로 그려진다(동적 렌더).
 * 그러면 `export const revalidate` 는 효과가 없고, 방문할 때마다 전수 COUNT 가 돈다.
 * 데이터 쪽에서 캐시해야 한다. 쿠키 없는 익명 조회라 사용자별로 섞일 값도 없다.
 *
 * load 는 실패하면 **던져야** 한다. unstable_cache 는 던진 결과를 저장하지 않으므로,
 * 일시적인 오류가 한 시간 동안 빈 화면으로 굳지 않는다. 바깥에서 받아 fallback 을 돌려준다.
 */
export const cacheAbout = <T>(
  key: string,
  load: () => Promise<T>,
  fallback: T
) => {
  const cached = unstable_cache(load, ['about', key], {
    revalidate: ABOUT_REVALIDATE_SECONDS,
  });

  return async (): Promise<T> => {
    try {
      return await cached();
    } catch (error) {
      // 섹션 하나의 내용이다 — 실패해도 페이지는 그린다
      console.error(
        `[about] ${key} 조회 실패:`,
        error instanceof Error ? error.message : error
      );
      return fallback;
    }
  };
};
