/**
 * 오늘의 독서운 — 문장 옆에 붙는 재미 점수(HJ, 2026-11-24 S1안).
 *
 * 규칙
 * - 날짜(KST) + 사람(회원=계정 id, 비회원=브라우저 열쇠)으로 정한다 → 같은 날 같은 사람은 몇 번을 봐도 같은 점수,
 *   사람마다 다른 점수. DB 를 거치지 않는 순수 계산이라 서버·브라우저 어디서 불러도 같다.
 * - 세부 셋(몰입운·발견운·문장운)은 70~99. 바닥을 70 으로 둬서 누구도 "나쁜 날"을 받지 않는다(다독이는 운세 말투).
 * - 총점은 세부 셋의 평균 — 숫자끼리 어긋나면 믿음이 안 간다.
 *
 * 왜 Math.random 이 아니라 해시인가: 결정적이어야 새로고침해도 점수가 그대로다(seeded random).
 */

export type DailyScoreItem = {
  key: 'focus' | 'discover' | 'sentence';
  label: string;
  value: number;
};

export type DailyScore = {
  total: number;
  items: DailyScoreItem[];
  /** 총점에 맞춘 한 줄 */
  comment: string;
};

const ITEMS: ReadonlyArray<Pick<DailyScoreItem, 'key' | 'label'>> = [
  { key: 'focus', label: '몰입운' },
  { key: 'discover', label: '발견운' },
  { key: 'sentence', label: '문장운' },
];

const MIN = 70;
const SPAN = 30; // 70~99

/** FNV-1a 32bit — 짧은 문자열을 고르게 흩는 가벼운 해시 */
export const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const commentFor = (total: number): string => {
  if (total >= 92) return '오래 미뤄 둔 책을 펼치기 좋은 날';
  if (total >= 85) return '한 챕터만 읽어도 마음이 정리되는 날';
  if (total >= 78) return '짧은 문장이 오래 남는 날';
  return '천천히 읽어도 괜찮은 날';
};

/**
 * @param dateKey KST 날짜 'YYYY-MM-DD'
 * @param seed 회원 id 또는 비회원 브라우저 열쇠
 */
export const dailyScore = (dateKey: string, seed: string): DailyScore => {
  const items = ITEMS.map(({ key, label }) => ({
    key,
    label,
    value: MIN + (fnv1a(`${dateKey}:${seed}:${key}`) % SPAN),
  }));
  const total = Math.round(
    items.reduce((sum, item) => sum + item.value, 0) / items.length
  );
  return { total, items, comment: commentFor(total) };
};
