'use client';

import { useEffect, useState } from 'react';

/**
 * placeholder를 일정 간격으로 회전시킨다.
 *
 * 멈춰야 할 때 멈춘다:
 * - `paused`가 true일 때 (예: 사용자가 검색창에 포커스한 동안)
 *   → 입력하려는데 힌트가 계속 바뀌면 방해가 된다
 * - `prefers-reduced-motion: reduce` 일 때
 *   → 움직임에 민감한 사용자에게는 첫 문구를 고정한다
 */
type Options = {
  /** 회전을 멈출지 (기본 false) */
  paused?: boolean;
  /** 간격(ms) */
  intervalMs?: number;
};

export const useRotatingPlaceholder = (
  items: readonly string[],
  { paused = false, intervalMs = 4000 }: Options = {}
): string => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || items.length <= 1) return;

    // 움직임을 줄여달라고 한 사용자에게는 회전시키지 않는다
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [paused, items.length, intervalMs]);

  return items[index] ?? '';
};
