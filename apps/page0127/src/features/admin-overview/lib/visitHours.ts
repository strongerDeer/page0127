import type { TrendPoint } from './trend';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 그날 첫 방문 시각(first_visit_at)을 KST 시(0~23)별로 센다.
 *
 * D-1 설계 때 이 용도로 남긴 컬럼이다 — 알림·푸시를 "사람들이 들어오는 시각"에 맞춰
 * 보내기 위한 근거. 하루 한 사람 한 줄이라 "그 시각에 그날 처음 들어온 사람 수"다.
 * 24칸을 다 깐다 — 0명인 시간대가 보여야 "새벽엔 아무도 없다"가 읽힌다.
 *
 * TrendBars 를 그대로 쓰려고 TrendPoint 모양으로 돌려준다(date 자리에 'HH').
 */
export const bucketByKstHour = (timestamps: string[]): TrendPoint[] => {
  const counts = Array<number>(24).fill(0);
  for (const t of timestamps) {
    const ms = new Date(t).getTime();
    if (Number.isNaN(ms)) continue;
    counts[new Date(ms + KST_OFFSET_MS).getUTCHours()]++;
  }
  return counts.map((count, h) => ({
    date: String(h).padStart(2, '0'),
    label: `${h}시`,
    count,
  }));
};

/** 가장 많이 들어오는 시각 (동률이면 이른 시각). 0명뿐이면 null */
export const peakHour = (points: TrendPoint[]): number | null => {
  let best = -1;
  let bestCount = 0;
  points.forEach((p, h) => {
    if (p.count > bestCount) {
      best = h;
      bestCount = p.count;
    }
  });
  return best === -1 ? null : best;
};
