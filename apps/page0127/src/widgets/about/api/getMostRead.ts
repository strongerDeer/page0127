import { createAnonClient } from '@/shared/config/supabase/anon';

import { type TopBook, type TopBookRow, toTopBooks } from '../model/topBooks';
import { cacheAbout } from './aboutCache';

import 'server-only';

const TOP_LIMIT = 3;

/**
 * 많이 읽힌 책 상위 3권 — 공개 RPC get_most_read_books (1시간 캐시).
 * ⚠️ 기간 조건이 없는 **누적** 완독 수다 — 카드 문구에 "이번 주"를 쓰지 않는다.
 * get_most_read_books 는 anon 실행이 허용돼 있고 is_public = true 인 완독만 센다.
 */
const loadMostRead = async (): Promise<TopBook[]> => {
  const { data, error } = await createAnonClient().rpc('get_most_read_books', {
    limit_count: TOP_LIMIT,
  });
  if (error) throw new Error(error.message);
  return toTopBooks(
    (data as TopBookRow[] | null) ?? [],
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  );
};

/** 카드 하나의 내용이다 — 실패하면 빈 목록('집계 중이에요') */
export const getMostRead = cacheAbout('most-read', loadMostRead, []);
