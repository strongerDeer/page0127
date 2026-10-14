type Span = { left: number; right: number };

/** 말풍선과 책장 가장자리 사이에 남길 여백(px) */
const EDGE_GAP = 8;

/**
 * 책 가운데에 띄운 말풍선이 책장 밖으로 나가면 안쪽으로 밀 거리(px).
 *
 * 줄 끝 책의 긴 제목 말풍선은 책장 밖으로 넘쳐 잘렸다(2026-10-14). CSS 만으로는 어느 책이
 * 가장자리인지 모르므로, 띄울 때 실제 위치를 재서 이 값만큼 옮긴다.
 * 양쪽 다 넘치면(상자보다 넓으면) 왼쪽에 맞춘다 — 글자의 시작이 보여야 읽힌다.
 */
export const tooltipShift = (tip: Span, box: Span): number => {
  const minLeft = box.left + EDGE_GAP;
  const maxRight = box.right - EDGE_GAP;
  if (tip.left < minLeft) return minLeft - tip.left;
  if (tip.right > maxRight) return maxRight - tip.right;
  return 0;
};
