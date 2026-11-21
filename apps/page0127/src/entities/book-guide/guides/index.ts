import type { ComponentType } from 'react';

/**
 * 읽기 가이드가 있는 책 — ISBN → 그 책 전용 파일.
 *
 * 왜 책마다 파일인가(HJ 11/21): 책마다 디자인이 달라질 것이라 정해진 틀(편집기)보다
 * 그때그때 HTML(JSX)을 짜는 게 맞다. 새 가이드 = 파일 하나 + 여기 한 줄.
 *
 * 왜 ISBN 인가: global_books id 는 dev·운영 DB 마다 달라 코드에 박을 수 없다. ISBN 은 같다.
 * 왜 import() 인가: 가이드 없는 책 페이지에는 가이드 코드가 번들에 섞이지 않는다.
 */
const GUIDES: Record<string, () => Promise<ComponentType>> = {
  // 대온실 수리 보고서
  '9788936439651': () => import('./daeonsil').then((m) => m.DaeonsilGuide),
};

export const hasBookGuide = (isbn: string | null | undefined) =>
  !!isbn && isbn in GUIDES;

/** 그 책 가이드 컴포넌트 — 없으면 null */
export const loadBookGuide = async (
  isbn: string | null | undefined
): Promise<ComponentType | null> => {
  const load = isbn ? GUIDES[isbn] : undefined;
  if (!load) return null;
  return load();
};
