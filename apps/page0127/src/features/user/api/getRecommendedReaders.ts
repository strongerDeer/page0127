import { FEATURED_READER_USERNAME } from '@/shared/config/featuredReader';
import { createClient } from '@/shared/config/supabase/server';
import { toRenderableSrc } from '@/shared/lib/imageHost';

import {
  type CoverRow,
  orderRecommended,
  type RecommendedReader,
} from '../model/recommendedReaders';

import 'server-only';

// 최근 공개 기록을 몇 행까지 훑어 리더를 모을지 — 한 사람이 여러 권을 연달아 기록하면
// 행 수보다 사람 수가 훨씬 적다
const RECENT_ROWS = 80;
const MAX_READERS = 8;

export type RecommendedReaderCard = RecommendedReader & {
  username: string | null;
  nickname: string | null;
  photoUrl: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  nickname: string | null;
  photo_url: string | null;
};

/** 그릴 수 없는 표지 호스트(알라딘 잔존 등)는 여기서 비운다 */
const toCoverRows = (rows: CoverRow[] | null): CoverRow[] => {
  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return (rows ?? []).map((row) => ({
    user_id: row.user_id,
    cover_image: toRenderableSrc(row.cover_image, storage),
  }));
};

/**
 * /search 첫 화면의 "추천 리더".
 *
 * 추천은 장식이 아니라 입구지만, 실패해도 검색은 그대로 쓸 수 있어야 한다
 * → 에러는 경고만 남기고 빈 목록을 돌려준다(화면은 기존 안내로 떨어진다).
 */
export async function getRecommendedReaders(
  currentUserId?: string
): Promise<RecommendedReaderCard[]> {
  const supabase = await createClient();

  // is_public 을 명시한다 — RLS 만 믿으면 로그인 사용자 자신의 비공개 기록이 섞인다
  const [featuredResult, recentResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id')
      .eq('username', FEATURED_READER_USERNAME)
      .maybeSingle(),
    supabase
      .from('books')
      .select('user_id, cover_image')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(RECENT_ROWS),
  ]);

  if (featuredResult.error || recentResult.error) {
    console.warn(
      `[getRecommendedReaders] 조회 실패: ${featuredResult.error?.message ?? ''} ${recentResult.error?.message ?? ''}`.trim()
    );
    return [];
  }

  const featuredId = (featuredResult.data as { id: string } | null)?.id ?? null;

  // 제작자는 최근 80행에 없을 수 있다 → 표지를 따로 받는다 (재독 중복을 감안해 넉넉히)
  let featuredRows: CoverRow[] = [];
  if (featuredId) {
    const { data, error } = await supabase
      .from('books')
      .select('user_id, cover_image')
      .eq('user_id', featuredId)
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(9);
    if (error) {
      console.warn(
        `[getRecommendedReaders] 제작자 표지 조회 실패: ${error.message}`
      );
    }
    featuredRows = toCoverRows(data as CoverRow[] | null);
  }

  const readers = orderRecommended({
    recentRows: toCoverRows(recentResult.data as CoverRow[] | null),
    featuredId,
    featuredRows,
    excludeId: currentUserId,
    limit: MAX_READERS,
  });
  if (readers.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    // email 등은 받지 않는다 — 카드에 필요한 것만
    .select('id, username, nickname, photo_url')
    .in(
      'id',
      readers.map((reader) => reader.userId)
    );
  if (profilesError) {
    console.warn(
      `[getRecommendedReaders] 프로필 조회 실패: ${profilesError.message}`
    );
    return [];
  }

  // in() 결과 순서는 보장되지 않는다 → 추천 순서대로 다시 맞추고, 프로필 없는 사람은 뺀다
  const profileById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );
  return readers.flatMap((reader) => {
    const profile = profileById.get(reader.userId);
    if (!profile) return [];
    return [
      {
        ...reader,
        username: profile.username,
        nickname: profile.nickname,
        photoUrl: profile.photo_url,
      },
    ];
  });
}
