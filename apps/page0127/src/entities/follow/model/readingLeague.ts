export type FollowingLeagueReader = {
  userId: string;
  username: string | null;
  nickname: string | null;
  photoUrl: string | null;
  completedBooks: number;
  totalPages: number;
  missingPageBooks: number;
};

export type FollowingLeague = {
  year: number;
  readers: FollowingLeagueReader[];
};

const invalidResponse = () =>
  new Error('독서 리그 집계 응답이 올바르지 않습니다.');
const nullableText = (value: unknown): string | null => {
  if (value === null || typeof value === 'string') return value;
  throw invalidResponse();
};
const count = (value: unknown): number => {
  if (
    typeof value !== 'number' &&
    !(typeof value === 'string' && /^\d+$/.test(value))
  )
    throw invalidResponse();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw invalidResponse();
  return parsed;
};

/** 빈 배열을 0권으로 다루지 않는다. 인증 만료나 누락으로 본인이 없으면 조회 실패다. */
export const parseFollowingLeague = (
  rows: unknown,
  currentUserId: string
): FollowingLeague => {
  if (!Array.isArray(rows) || rows.length === 0) throw invalidResponse();
  let year: number | undefined;
  const ids = new Set<string>();
  const readers = rows.map((raw: unknown): FollowingLeagueReader => {
    if (typeof raw !== 'object' || raw === null) throw invalidResponse();
    const row = raw as Record<string, unknown>;
    if (typeof row.user_id !== 'string' || ids.has(row.user_id))
      throw invalidResponse();
    ids.add(row.user_id);
    const rowYear = count(row.library_year);
    if (rowYear < 1900 || (year !== undefined && year !== rowYear))
      throw invalidResponse();
    year = rowYear;
    return {
      userId: row.user_id,
      username: nullableText(row.username),
      nickname: nullableText(row.nickname),
      photoUrl: nullableText(row.photo_url),
      completedBooks: count(row.completed_books),
      totalPages: count(row.total_pages),
      missingPageBooks: count(row.missing_page_books),
    };
  });
  if (!ids.has(currentUserId) || year === undefined) throw invalidResponse();
  return { year, readers };
};
