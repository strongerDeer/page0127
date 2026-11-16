import { unstable_cache } from 'next/cache';

import { createAnonClient } from '@/shared/config/supabase/anon';

import {
  BOOKS_ALL_CACHE_TAG,
  type CatalogPageKey,
} from '../model/catalogPageCache';
import { catalogVisibilityFilter } from './catalogVisibility';

import type { GlobalBook } from '../types';

import 'server-only';

export type CatalogPage = { books: GlobalBook[]; count: number | null };

/**
 * 비로그인 방문자용 전체 도서 한 페이지 — 시간 만료 없이, 책이 추가·승인·수정·삭제될 때만 버린다.
 *
 * 왜 캐시하나 (2026-11-16 LCP 분석):
 * 이 페이지는 loading.tsx 로 스켈레톤을 먼저 보내고, DB 조회(목록 + 전체 개수 count)가
 * 끝나야 진짜 목록을 이어 보낸다. 그 대기가 약 0.9초였고, 화면의 LCP(저자 이름 글자)가
 * 그만큼 늦게 그려졌다. 비로그인 방문자는 누구에게나 같은 목록이 보이므로 캐시해 두면
 * 데이터 캐시를 읽는 수십 ms 만에 본문이 나온다. 검색엔진·처음 온 사람·품질 측정이 여기다.
 *
 * - 쿠키 없는 anon 클라이언트: 모든 방문자에게 같은 결과라 세션이 섞이면 안 된다.
 * - 실패하면 던진다 — unstable_cache 는 던진 결과를 저장하지 않으므로 일시 오류가
 *   한 시간 동안 빈 목록으로 굳지 않는다(getShelfPicks.ts 와 같은 이유).
 * - 인자(page·sort·order)는 unstable_cache 가 키에 자동으로 넣는다.
 *
 * 왜 시간 만료(revalidate)를 두지 않나 (2026-11-16 db-timeout 알림):
 * 시간이 지나 낡으면 unstable_cache 는 낡은 값을 주고 **화면 뒤에서** 다시 조회한다.
 * 그런데 이 페이지는 loading.tsx(Suspense) 안이라 그 재조회가 셸을 보낸 뒤에 등록되고,
 * Next(16.4)는 셸 시점의 재조회만 waitUntil 로 지켜 준다. 응답이 끝나 함수가 멈추면
 * 재조회가 끊기고, 다음에 깨어날 때 5초 상한에 걸려 [db-timeout] 알림이 된다(홈 #306 과 같은 구조).
 * 그래서 시간으로는 낡지 않게 두고, global_books 를 바꾸는 모든 곳에서
 * revalidateBookInfoPages() 로 태그를 버린다. 태그로 버린 뒤 첫 요청은 기다려서 새로 받으므로
 * 배경 재조회가 생기지 않는다.
 * ⚠️ global_books 를 바꾸는 새 경로를 만들면 revalidateBookInfoPages() 를 꼭 부를 것.
 *    (운영 스크립트·대시보드에서 DB 를 직접 고친 건 다음 배포나 책 변경 때까지 반영되지 않는다)
 */
const loadCatalogPage = async ({
  page,
  sort,
  order,
  limit,
}: CatalogPageKey): Promise<CatalogPage> => {
  const from = (page - 1) * limit;
  const { data, count, error } = await createAnonClient()
    .from('global_books')
    .select('*', { count: 'exact' })
    .eq('review_status', 'approved')
    // 비로그인 기준: 직접 등록 책은 빠진다(catalogVisibility.ts)
    .or(catalogVisibilityFilter(null))
    .order(sort, { ascending: order === 'asc' })
    .range(from, from + limit - 1);
  if (error) throw new Error(error.message);
  return { books: (data as GlobalBook[] | null) ?? [], count };
};

export const getCachedCatalogPage = unstable_cache(
  loadCatalogPage,
  ['books-all', 'catalog-page'],
  { revalidate: false, tags: [BOOKS_ALL_CACHE_TAG] }
);
