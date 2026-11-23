'use client';

import { type RefObject, useEffect, useState } from 'react';

/**
 * 요소가 화면에 `rootMargin` 만큼 가까워지면 true 가 되고, 그 뒤로는 계속 true 다.
 *
 * 왜 브라우저의 loading="lazy" 로는 부족한가: 크롬은 화면에서 1250~2500px 떨어진
 * 이미지까지 미리 받는다(느린 회선일수록 더 멀리). 첫 로드 때 그 이미지들이
 * 첫 화면 표지·JS 와 대역폭을 나눠 가져 LCP 가 늦어졌다(2026-11-23, 전체 도서).
 * 이 훅은 "언제 받기 시작할지"를 우리가 정한다.
 *
 * IntersectionObserver 가 없는 환경(아주 오래된 브라우저·일부 테스트)에서는
 * 바로 true 로 둔다 — 늦게 받는 것보다 안 보이는 쪽이 더 나쁘다.
 */
export const useNearViewport = (
  ref: RefObject<Element | null>,
  { rootMargin = '300px 0px', enabled = true } = {}
): boolean => {
  const [near, setNear] = useState(!enabled);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // 서버 HTML 과 첫 렌더는 자리 표시로 맞추고(hydration 불일치 방지), 바로 다음 틱에 그린다
      const id = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, ref, rootMargin]);

  return near;
};
