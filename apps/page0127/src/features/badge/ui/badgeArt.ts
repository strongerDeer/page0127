import type { BadgeId } from '../model/badges';

/**
 * 뱃지 그림 데이터 — 모양·색·금속.
 *
 * 레퍼런스(에나멜 핀 뱃지)처럼 "금속 테두리 + 색면 + 가운데 기호" 구조를 쓰되,
 * 모양을 책에서 가져왔다.
 * - 성장: 책 표지. 단계가 오를 때마다 테두리 금속이 바뀐다
 * - 이야기: 책갈피 리본
 * - 히든: 밀랍 봉인 — "봉해진 비밀"이라 받기 전엔 회색 봉인에 물음표
 */

export type Metal = 'bronze' | 'silver' | 'gold' | 'rose' | 'holo';

/** 테두리 그라디언트 3색 (어두움 → 밝음 → 어두움) */
export const METAL_STOPS: Record<Metal, [string, string, string]> = {
  bronze: ['#8a4f24', '#f0c193', '#a5622f'],
  silver: ['#7d8692', '#f5f7fa', '#8e97a3'],
  gold: ['#9a6b00', '#ffe9a3', '#b8860b'],
  rose: ['#9c4f5a', '#ffd3d8', '#b8646f'],
  holo: ['#6d5bd0', '#b8f3ff', '#e58bd8'],
};

/** 성장 뱃지 단계별 금속 — 1단계 브론즈부터 */
export const LEVEL_METALS: Metal[] = [
  'bronze',
  'silver',
  'gold',
  'rose',
  'holo',
];

/** 에나멜 색 [밝은 위, 진한 아래] */
export const ENAMEL: Record<BadgeId, [string, string]> = {
  shelf: ['#4f7cf3', '#1e40af'],
  'wide-view': ['#2fc59a', '#05775a'],
  'one-sitting': ['#ffc04d', '#e5860b'],
  brick: ['#ff8a78', '#d9473a'],
  'author-fan': ['#a98bfa', '#6d3fe0'],
  finally: ['#6fd3ff', '#1a8fd0'],
  reread: ['#5ee08b', '#17a34a'],
  'life-book': ['#3fe0cb', '#0d9488'],
  critic: ['#ff8cc6', '#d42f86'],
  'goal-kept': ['#6aa8ff', '#2563eb'],
  'know-yourself': ['#8d90ff', '#4f46e5'],
  // 히든은 밀랍 색
  'day-0127': ['#e2574c', '#9e1c17'],
  'new-year': ['#e2574c', '#9e1c17'],
  'double-finish': ['#e2574c', '#9e1c17'],
  honest: ['#e2574c', '#9e1c17'],
  'thin-but-deep': ['#e2574c', '#9e1c17'],
  'new-release': ['#e2574c', '#9e1c17'],
  'book-about-books': ['#e2574c', '#9e1c17'],
  'worn-out': ['#e2574c', '#9e1c17'],
};

/** 잠긴 뱃지 — 은색 엠보싱(색을 다 빼고 금속 질감만 남긴다) */
export const LOCKED_ENAMEL: [string, string] = ['#eef1f4', '#c9cfd6'];
export const LOCKED_METAL: [string, string, string] = [
  '#b7bec7',
  '#f7f9fb',
  '#a9b1bb',
];

/** 책갈피: 위는 둥근 사각, 아래는 V 로 파인 리본 (viewBox 100×110) */
export const BOOKMARK_PATH =
  'M24 6H76a5 5 0 0 1 5 5V102L50 82 19 102V11a5 5 0 0 1 5-5Z';
export const BOOKMARK_STITCH_PATH =
  'M28 12H72a2 2 0 0 1 2 2V89L50 72 26 89V14a2 2 0 0 1 2-2Z';

/** 밀랍 봉인 — 원 둘레가 18번 부풀어 오른 물결 (viewBox 100×110, 중심 50,56) */
export const SEAL_PATH = (() => {
  const cx = 50;
  const cy = 56;
  const bumps = 18;
  const at = (r: number, angle: number) =>
    `${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`;
  const step = (Math.PI * 2) / bumps;
  let d = `M${at(40, -Math.PI / 2)}`;
  for (let i = 0; i < bumps; i += 1) {
    const start = -Math.PI / 2 + step * i;
    // 두 골 사이를 바깥쪽 조절점으로 부풀린다
    d += `Q${at(48, start + step / 2)} ${at(40, start + step)}`;
  }
  return `${d}Z`;
})();
