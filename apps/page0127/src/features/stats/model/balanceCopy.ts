import { BALANCE_CATEGORIES, type ReadingBalance } from '@/entities/book';

/** 문구는 진행형 — "기울었다" 같은 판단은 쓰지 않는다(2026-10-08 반려 기록) */
export const getBalanceLabel = (score: number | null): string => {
  if (score === null) return '책이 더 쌓이면 보여요';
  if (score < 40) return '한 우물을 깊이 파는 중';
  if (score < 70) return '조금씩 넓혀 가는 중';
  return '고르게 읽는 중';
};

/**
 * 받침 유무로 '이/가'를 고른다.
 * 학습 포인트: 한글 음절은 U+AC00 부터 (초성 19 × 중성 21 × 종성 28) 순서라
 * (코드 − 0xAC00) % 28 이 0 이면 받침이 없다.
 */
const subjectParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return hasBatchim ? '이' : '가';
};

export const getBalanceSummary = (balance: ReadingBalance): string => {
  if (balance.total === 0) {
    // 완독은 있는데 전부 분류 불명이면 "0권"처럼 말하면 사실과 다르다
    return balance.unclassified > 0
      ? `분야 정보가 없는 책 ${balance.unclassified}권은 아직 셀 수 없어요`
      : '완독한 책이 쌓이면 분야가 채워져요';
  }
  const top = balance.ranked
    .slice(0, 2)
    .map(({ category }) => category)
    .join('·');
  return `${BALANCE_CATEGORIES.length}개 분야 중 ${balance.readCount}개를 읽었어요. ${top}${subjectParticle(top)} ${balance.topShare}%`;
};

export const getBalanceDelta = (balance: ReadingBalance): string | null => {
  if (!balance.prev) return null;
  const { readCountDelta, newCategories } = balance.prev;
  if (readCountDelta > 0) {
    const added =
      newCategories.length > 0 ? ` (+${newCategories.join(', ')})` : '';
    return `작년보다 ${readCountDelta}개 분야 넓어졌어요${added}`;
  }
  if (readCountDelta === 0) {
    return `작년과 같은 ${balance.readCount}개 분야를 읽고 있어요`;
  }
  return `작년엔 ${balance.readCount - readCountDelta}개 분야를 읽었어요`;
};

/** 안 읽은 분야는 이만큼만 권한다 — 전부 나열하면 할 일 목록처럼 읽혔다(2026-10-31) */
const MAX_NEXT_CATEGORIES = 2;

/**
 * 다음에 읽어 볼 분야 — 가장 많이 읽은 분야와 가까운 안 읽은 분야 최대 2개.
 * '가깝다' = BALANCE_CATEGORIES 순서(레이더 축 순서)에서 옆자리.
 * 순서가 소설 → 에세이 → 인문 → 사회/역사 → 과학/IT → 경제 → 자기계발 → 예술/생활 → (다시 소설)
 * 로 이웃끼리 결이 비슷하게 놓여 있어서, 옆자리부터 고르면 손이 덜 가는 분야를 권하게 된다.
 * 거리가 같으면 순서상 뒤쪽(시계 방향)을 먼저 본다.
 */
export const nextCategories = (balance: ReadingBalance): string[] => {
  const top = balance.ranked[0]?.category;
  if (!top) return [];
  const unread = new Set<string>(balance.zero);
  const size = BALANCE_CATEGORIES.length;
  const start = BALANCE_CATEGORIES.indexOf(top);
  const picked: string[] = [];
  for (let distance = 1; distance <= size / 2; distance += 1) {
    for (const step of [distance, -distance]) {
      const category = BALANCE_CATEGORIES[(start + step + size) % size];
      if (unread.has(category) && !picked.includes(category)) {
        picked.push(category);
      }
    }
  }
  return picked.slice(0, MAX_NEXT_CATEGORIES);
};

/** 레이더 축 상한 — 9축은 촘촘해서 라벨이 겹치고 모양이 안 읽혔다 */
const MAX_RADAR_AXES = 8;
/** 이보다 적으면 선·점이라 '모양'이 없다 */
const MIN_RADAR_AXES = 3;

/**
 * 레이더에 그릴 축 — 내가 읽은 분야만, 최대 8개.
 * 고르는 건 많이 읽은 순, 그리는 순서는 고정 분야 순서(categories).
 * 많이 읽은 순으로 돌리면 값이 계속 줄어들어 누구 레이더든 소용돌이 모양이 된다.
 * 안 읽은 분야는 축 대신 텍스트로 보여 준다(사람마다 축이 다르다).
 * 3개 미만이면 빈 배열 — 그때는 레이더 없이 띠만 그린다.
 */
export const radarAxes = (
  balance: ReadingBalance
): { category: string; count: number }[] => {
  const picked = new Set(
    balance.ranked.slice(0, MAX_RADAR_AXES).map(({ category }) => category)
  );
  if (picked.size < MIN_RADAR_AXES) return [];
  return balance.categories
    .filter(({ category }) => picked.has(category))
    .map(({ category, count }) => ({ category, count }));
};

/**
 * 차트 계열 토큰 7개. 이름을 템플릿(`--chart-${n}`)으로 만들면
 * app/token-usage.test.ts 가 정의 여부를 대조할 수 없다 → 글자 그대로 나열한다.
 * 달력 기간 막대도 같은 순서를 쓴다.
 */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
] as const;

/** 순위 → 분야 색. 토큰이 7개라 8·9위는 슬레이트(chart-5)를 함께 쓴다 */
export const categoryColor = (rank: number): string =>
  rank < CHART_COLORS.length ? CHART_COLORS[rank] : 'var(--chart-5)';

/**
 * 순위 → 분야 칸 위 글자색. 칸 색마다 흰 글자·남색 글자 중 4.5:1 을 넘는 쪽을 고른다
 * (흰 글자 하나로 쓰면 스카이·앰버·틸 칸이 2.2~2.5 였다 — Lighthouse 2026-10-27).
 * 다크는 chart-1·2·3 색이 바뀌어 고르는 쪽도 다르다. 순서는 CHART_COLORS 와 같다.
 */
const ON_CHART_INK = [
  'text-white dark:text-[var(--navy-900)]', // chart-1 blue/600 5.33 · 다크 blue/300 6.45
  'text-white dark:text-[var(--navy-900)]', // chart-2 orange/600 5.34 · 다크 orange/400 4.51
  'text-[var(--navy-900)] dark:text-white', // chart-3 blue/300 6.45 · 다크 blue/500 4.36(가장 가까움)
  'text-[var(--navy-900)]', // chart-4 amber/500 6.42
  'text-white', // chart-5 slate/500 5.35 · 다크 slate/400 4.75
  'text-[var(--navy-900)]', // chart-6 teal/500 5.79
  'text-white', // chart-7 violet/500 4.55
] as const;

/** 분야 칸 위 글자색(Tailwind 클래스). 8·9위는 categoryColor 처럼 chart-5 를 따른다 */
export const categoryInk = (rank: number): string =>
  rank < ON_CHART_INK.length ? ON_CHART_INK[rank] : ON_CHART_INK[4];
