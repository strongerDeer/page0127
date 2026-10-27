/**
 * DAU·WAU·MAU·고착도와 베타 현황 — 어드민 홈 맨 위 숫자.
 *
 * 전부 "순 사용자"(같은 사람은 한 번)다. 예전 "최근 7일 방문"은 연인원이라
 * 3일 온 1명이 3으로 세져 WAU 로 읽으면 틀렸다.
 *
 * 고착도 = 30일 평균 DAU ÷ MAU. "한 달에 들어온 사람이 평균 며칠에 한 번 오나"를
 * 한 숫자로 본다(20% ≈ 한 달에 6일). 어제 DAU 하나로 나누면 10명 규모에선 하루하루 크게 출렁여서
 * 30일 평균을 쓴다.
 */

export type Visit = { user_id: string; visit_date: string };

export type ActivitySummary = {
  dau: number;
  /** 오늘(진행 중) 방문자 — 참고용 */
  today: number;
  wau: number;
  mau: number;
  /** 30일 평균 DAU ÷ MAU. MAU 가 0 이면 null */
  stickiness: number | null;
};

const uniqueUsers = (visits: Visit[], from: string, to: string): Set<string> =>
  new Set(
    visits
      .filter((v) => v.visit_date >= from && v.visit_date <= to)
      .map((v) => v.user_id)
  );

export const summarizeActivity = (
  visits: Visit[],
  p: { today: string; yesterday: string; weekStart: string; monthStart: string }
): ActivitySummary => {
  const mau = uniqueUsers(visits, p.monthStart, p.yesterday).size;
  // visit 은 하루 한 사람 한 줄이라 구간 행 수 = DAU 합계
  const dauSum = visits.filter(
    (v) => v.visit_date >= p.monthStart && v.visit_date <= p.yesterday
  ).length;
  return {
    dau: uniqueUsers(visits, p.yesterday, p.yesterday).size,
    today: uniqueUsers(visits, p.today, p.today).size,
    wau: uniqueUsers(visits, p.weekStart, p.yesterday).size,
    mau,
    stickiness: mau === 0 ? null : dauSum / 30 / mau,
  };
};

export type BetaStatus = {
  /** 운영자를 뺀 회원 수 */
  members: number;
  /** 책을 1권 이상 넣은 회원 */
  withBooks: number;
  /** 최근 3일(오늘 포함) 한 번도 안 온 회원 — 가입 3일이 안 된 사람은 빼고 센다 */
  idle: number;
  /** 알림(웹푸시)을 켠 회원 — 아이폰은 홈 화면에 설치해야만 켤 수 있어 설치의 신호이기도 하다 */
  withPush: number;
};

export const summarizeBeta = (
  members: { id: string; createdAt: string }[],
  bookOwnerIds: string[],
  visits: Visit[],
  p: { today: string; recentStart: string },
  pushUserIds: string[] = []
): BetaStatus => {
  const owners = new Set(bookOwnerIds);
  const pushUsers = new Set(pushUserIds);
  const recent = uniqueUsers(visits, p.recentStart, p.today);
  return {
    members: members.length,
    withBooks: members.filter((m) => owners.has(m.id)).length,
    // 가입일(KST)이 최근 3일 안이면 아직 "멈췄다"고 볼 수 없다
    idle: members.filter(
      (m) => m.createdAt < p.recentStart && !recent.has(m.id)
    ).length,
    // 한 사람이 폰·노트북에서 켜면 구독이 둘이라 회원 기준으로 센다
    withPush: members.filter((m) => pushUsers.has(m.id)).length,
  };
};
