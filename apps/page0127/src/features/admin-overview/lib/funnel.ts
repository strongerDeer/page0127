/**
 * 가입 퍼널 — 기간 안에 가입한 사람이 "와서 무엇까지 했나".
 *
 * 재방문(retention.ts)이 "다시 오나"라면 이건 "와서 뭘 하나"다. 둘 다 같은 가입
 * 코호트를 보므로 같은 기간 선택을 따른다.
 *
 * 전부 books 로 소급 계산된다(마이그레이션·이벤트 없음). 단계는 "지금까지 한 번이라도"
 * 기준이라, 최근 가입자는 아직 할 시간이 적었다는 것을 감안해서 읽는다.
 * 예외로 "24시간 안 첫 책"은 가입 직후 행동이라 기간 끝 하루 전 가입자까지만 판정한다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type FunnelStepKey = 'signup' | 'firstBook' | 'completed' | 'review';

export type FunnelStep = {
  key: FunnelStepKey;
  label: string;
  /** 이 단계까지 온 사람 */
  users: number;
  /** 가입자 대비 */
  ofSignups: number | null;
  /** 바로 앞 단계 대비 — 어디서 가장 많이 빠지는지 */
  ofPrev: number | null;
};

export type FunnelSummary = {
  steps: FunnelStep[];
  /** 가입 24시간 안에 첫 책 — 활성화 지표 */
  activation24h: { eligible: number; activated: number; rate: number | null };
};

export type FunnelSignup = { id: string; createdAt: string };
export type FunnelBook = {
  user_id: string;
  created_at: string;
  status: string;
  one_line_review: string | null;
};

const rate = (n: number, d: number): number | null => (d === 0 ? null : n / d);

/**
 * @param now 24시간 창이 끝났는지 판정하는 기준 시각
 */
export const computeFunnel = (
  signups: FunnelSignup[],
  books: FunnelBook[],
  now: Date
): FunnelSummary => {
  type UserAcc = {
    firstBookAt: number | null;
    completed: boolean;
    review: boolean;
  };
  const acc = new Map<string, UserAcc>(
    signups.map((s) => [
      s.id,
      { firstBookAt: null, completed: false, review: false },
    ])
  );

  for (const b of books) {
    const u = acc.get(b.user_id);
    if (!u) continue;
    const at = new Date(b.created_at).getTime();
    if (u.firstBookAt === null || at < u.firstBookAt) u.firstBookAt = at;
    if (b.status === 'completed') u.completed = true;
    if (b.one_line_review?.trim()) u.review = true;
  }

  const counts: Record<FunnelStepKey, number> = {
    signup: signups.length,
    firstBook: 0,
    completed: 0,
    review: 0,
  };
  let eligible = 0;
  let activated = 0;
  const nowMs = now.getTime();

  for (const s of signups) {
    const u = acc.get(s.id);
    if (!u) continue;
    if (u.firstBookAt !== null) counts.firstBook++;
    if (u.completed) counts.completed++;
    if (u.review) counts.review++;

    const signupMs = new Date(s.createdAt).getTime();
    // 가입한 지 24시간이 안 지났으면 아직 판정하지 않는다
    if (signupMs + DAY_MS > nowMs) continue;
    eligible++;
    if (u.firstBookAt !== null && u.firstBookAt - signupMs <= DAY_MS)
      activated++;
  }

  const defs: [FunnelStepKey, string][] = [
    ['signup', '가입'],
    ['firstBook', '첫 책 등록'],
    ['completed', '첫 완독'],
    ['review', '한줄 생각'],
  ];
  return {
    steps: defs.map(([key, label], i) => ({
      key,
      label,
      users: counts[key],
      ofSignups: rate(counts[key], counts.signup),
      ofPrev: i === 0 ? null : rate(counts[key], counts[defs[i - 1][0]]),
    })),
    activation24h: { eligible, activated, rate: rate(activated, eligible) },
  };
};
