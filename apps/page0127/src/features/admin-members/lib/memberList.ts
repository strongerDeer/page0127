/**
 * 회원 관리 목록의 나누기·번호·정렬·접속자 수 — DB 없이 계산만 하는 순수 함수.
 *
 * 왜 DB가 아니라 여기서 정렬하는가(2026-11-24 HJ 선택, A안):
 *   "최근 접속"·"활동일"은 profiles 칸이 아니라 user_daily_visits 에서 계산한 값이다.
 *   DB에서 50명씩 잘라 오면(range) 이 값으로 정렬할 수 없다. 회원이 수십~수백 명인 지금은
 *   전부 읽어 앱에서 정렬하는 편이 단순하다. 수천 명이 되면 profiles.last_seen_at 칸을 두고
 *   DB가 정렬하게 옮긴다(B안).
 */

export type MemberSort = 'joined' | 'recent' | 'active';

export const MEMBER_SORTS: { value: MemberSort; label: string }[] = [
  { value: 'joined', label: '가입순' },
  { value: 'recent', label: '최근 접속순' },
  { value: 'active', label: '활동일 많은 순' },
];

/** URL 의 ?sort= 값 → 알 수 없는 값이면 가입순 */
export const parseMemberSort = (raw: string | undefined): MemberSort =>
  raw === 'recent' || raw === 'active' ? raw : 'joined';

/** 정렬·번호에 필요한 최소 정보 */
export type SortableMember = {
  id: string;
  createdAt: string;
  /** 최근 30일 안 마지막 방문일(KST YYYY-MM-DD). 없으면 null */
  lastVisit: string | null;
  activeDays: number;
};

/**
 * 가입 순서 번호(1번 = 첫 가입자). 정렬을 바꿔도 사람마다 번호가 그대로여야
 * "몇 번째 가입자"로 읽히므로, 정렬과 따로 계산해 id → 번호로 돌려준다.
 */
export const signupNumbers = (members: SortableMember[]): Map<string, number> =>
  new Map(
    [...members]
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
      )
      .map((m, i) => [m.id, i + 1])
  );

/** 최신 가입이 먼저 */
const byJoinedDesc = (a: SortableMember, b: SortableMember) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

/** 최근 방문이 먼저, 30일 안 방문이 없으면 맨 뒤(그 안에서는 최신 가입순) */
const byRecentDesc = (a: SortableMember, b: SortableMember) => {
  if (a.lastVisit !== b.lastVisit) {
    if (a.lastVisit === null) return 1;
    if (b.lastVisit === null) return -1;
    return b.lastVisit.localeCompare(a.lastVisit);
  }
  return byJoinedDesc(a, b);
};

export const sortMembers = <T extends SortableMember>(
  members: T[],
  sort: MemberSort
): T[] => {
  const copy = [...members];
  switch (sort) {
    case 'recent':
      return copy.sort(byRecentDesc);
    case 'active':
      // 활동일이 같으면 최근에 온 사람이 먼저
      return copy.sort(
        (a, b) => b.activeDays - a.activeDays || byRecentDesc(a, b)
      );
    default:
      return copy.sort(byJoinedDesc);
  }
};

/**
 * 최근 N일(오늘 포함) 안에 한 번이라도 접속한 회원 수 — 순 사용자.
 * @param since 구간 시작일(KST YYYY-MM-DD). lastVisit 이 이 날 이상이면 센다
 */
export const countVisitedSince = (
  members: { lastVisit: string | null }[],
  since: string
): number =>
  members.filter((m) => m.lastVisit !== null && m.lastVisit >= since).length;
