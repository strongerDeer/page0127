/**
 * 추천 리더 순서 — ID 를 몰라도 만날 수 있는 사람들.
 *
 * 학습 포인트:
 * - 제작자는 항상 맨 앞(사용자 결정). 단, 본인에게 본인을 추천하지는 않는다.
 * - 그 뒤는 "최근에 공개 기록을 남긴 리더" — 지금 활동하는 사람이 먼저 보인다.
 * - 사람을 책으로 소개한다: 카드에 그 리더의 최근 표지를 붙인다.
 */

/** 리더 한 명에 붙이는 표지 수 */
export const COVERS_PER_READER = 3;

/** books 에서 받아 오는 최소 필드 (updated_at 내림차순으로 들어온다고 가정) */
export type CoverRow = {
  user_id: string;
  /** 그릴 수 없는 호스트는 호출부에서 null 로 비워 둔다 */
  cover_image: string | null;
};

export type RecommendedReader = {
  userId: string;
  featured: boolean;
  covers: string[];
};

type OrderInput = {
  recentRows: CoverRow[];
  /** 제작자 프로필 id — 못 찾았으면 null */
  featuredId: string | null;
  /** 제작자의 최근 공개 기록 (최근 행 목록에 없을 수 있어 따로 받는다) */
  featuredRows: CoverRow[];
  /** 로그인한 본인 */
  excludeId?: string;
  /** 제작자를 포함한 최대 인원 */
  limit: number;
};

/** 사람별 표지를 순서대로 모은다 — 빈 값·중복(재독)은 건너뛴다 */
const collectCovers = (rows: CoverRow[]): Map<string, string[]> => {
  const byUser = new Map<string, string[]>();
  for (const { user_id, cover_image } of rows) {
    const covers = byUser.get(user_id) ?? [];
    byUser.set(user_id, covers);
    if (!cover_image || covers.includes(cover_image)) continue;
    if (covers.length < COVERS_PER_READER) covers.push(cover_image);
  }
  return byUser;
};

export const orderRecommended = ({
  recentRows,
  featuredId,
  featuredRows,
  excludeId,
  limit,
}: OrderInput): RecommendedReader[] => {
  const result: RecommendedReader[] = [];

  if (featuredId && featuredId !== excludeId) {
    result.push({
      userId: featuredId,
      featured: true,
      covers: collectCovers(featuredRows).get(featuredId) ?? [],
    });
  }

  // Map 의 키 순서 = 처음 등장한 순서 = 가장 최근 기록 순
  for (const [userId, covers] of collectCovers(recentRows)) {
    if (userId === featuredId || userId === excludeId) continue;
    result.push({ userId, featured: false, covers });
  }

  return result.slice(0, limit);
};
