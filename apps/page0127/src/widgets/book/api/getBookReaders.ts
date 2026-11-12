// FSD: widgets는 app을 import할 수 없다 (역방향)
// → @/app/api/_helpers/auth의 getSupabaseClient 대신 호출하는 쪽이 클라이언트를 넘긴다
import { getConnectionIds } from '@/entities/follow/api/getConnectionIds';

import {
  type BookReaderRow,
  pickBookReaders,
  type ReaderEntry,
  type ReaderProfile,
} from '../model/bookReaders';

import type { SupabaseClient } from '@supabase/supabase-js';

import 'server-only';

// 접힌 목록까지 합쳐 그리는 최대 인원 (그 이상은 숫자로만 알린다)
// 얼굴은 나·팔로잉·팔로워만 보여 준다 — 모르는 사람은 숫자로만
const MAX_READERS = 20;
// 재독으로 한 사람이 여러 행을 가질 수 있어, 중복 제거를 감안해 넉넉히 받는다
const FETCH_LIMIT = 60;

const fetchReaderRows = async (
  supabase: SupabaseClient,
  isbn: string,
  onlyUserIds?: string[]
) => {
  let query = supabase
    .from('books')
    .select('user_id, status')
    .eq('isbn', isbn)
    .in('status', ['reading', 'completed'])
    // RLS 만 믿으면 로그인 사용자에게는 자기 비공개 기록까지 섞여 방문자와 숫자가 달라진다.
    // "이 책을 읽은 리더"는 공개 기록으로 명시해 좁힌다.
    .eq('is_public', true);
  if (onlyUserIds) query = query.in('user_id', onlyUserIds);

  // 최근에 기록을 만진 리더가 앞에 온다 — 지금 이 책과 함께 있는 사람
  return query.order('updated_at', { ascending: false }).limit(FETCH_LIMIT);
};

/**
 * 이 책을 읽은 리더 "수" — 누가 보든 같은 숫자라 캐시되는 책 정보 페이지에서 그린다.
 * 조회가 깨졌으면 null (화면은 섹션을 접는다).
 */
export const getPublicReaderTotal = async (
  supabase: SupabaseClient,
  isbn: string
): Promise<number | null> => {
  // books.user_id 의 외래키는 auth.users 하나뿐이고 profiles 를 참조하지 않는다.
  // → PostgREST 가 books ↔ profiles 관계를 찾지 못해 중첩 select 조인은 PGRST200 으로 실패한다.
  //   그래서 user_id 를 먼저 모으고 profiles 를 따로 조회하는 2단계 방식을 쓴다.
  const { data, error } = await fetchReaderRows(supabase, isbn);

  // 에러를 버리면 "리더 없음"과 "쿼리가 깨졌음"이 구분되지 않는다.
  if (error) {
    console.warn(
      `[getBookReaders] 리더 조회 실패 (isbn=${isbn}): ${error.message}`
    );
    return null;
  }
  return pickBookReaders((data ?? []) as BookReaderRow[], MAX_READERS).total;
};

/**
 * 나와 이어진 리더(나·팔로잉·팔로워)의 얼굴 — 사람마다 다르므로 로그인한 브라우저가 API 로 받는다.
 * total 은 이어진 사람 수다. 화면은 전체 수(캐시)와 큰 쪽을 쓴다.
 */
export const getConnectedReaders = async (
  supabase: SupabaseClient,
  isbn: string,
  userId: string
): Promise<{ items: ReaderEntry[]; total: number }> => {
  const connectionIds = await getConnectionIds(userId);
  // 전체 60행 안에 안 든 오래된 기록도 놓치지 않도록 이어진 사람만 따로 다시 받는다
  const { data: rows, error } = await fetchReaderRows(
    supabase,
    isbn,
    connectionIds
  );
  if (error) {
    console.warn(
      `[getBookReaders] 이어진 리더 조회 실패 (isbn=${isbn}): ${error.message}`
    );
    return { items: [], total: 0 };
  }

  const { readers, total } = pickBookReaders(
    (rows ?? []) as BookReaderRow[],
    MAX_READERS
  );
  if (readers.length === 0) return { items: [], total };

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    // email 등 다른 컬럼은 받지 않는다 — 화면에 필요한 것만
    .select('id, username, nickname, photo_url')
    .in(
      'id',
      readers.map((reader) => reader.userId)
    );

  if (profilesError) {
    console.warn(
      `[getBookReaders] 프로필 조회 실패 (isbn=${isbn}): ${profilesError.message}`
    );
    return { items: [], total };
  }

  // in() 결과 순서는 보장되지 않으므로 리더 순서대로 다시 맞춘다
  const profileById = new Map(
    ((profiles ?? []) as ReaderProfile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );
  const items = readers.flatMap((reader) => {
    const profile = profileById.get(reader.userId);
    return profile ? [{ profile, status: reader.status }] : [];
  });
  return { items, total };
};
