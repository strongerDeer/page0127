'use client';

import { useEffect, useRef, useState } from 'react';

type CountUpProps = { to: number; unit: string };

/**
 * 화면에 들어오면 0부터 센다.
 * 서버 HTML·JS 실패·움직임 줄이기에서는 최종 값을 그대로 보여 준다(처음 값이 to).
 */
export const CountUp = ({ to, unit }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const frame = (t: number) => {
          const k = Math.min(1, (t - start) / 1400);
          // 처음엔 빠르게, 끝에서 천천히 멈춘다(ease-out cubic)
          setN(Math.round(to * (1 - (1 - k) ** 3)));
          if (k < 1) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span ref={ref}>
      {n.toLocaleString('ko-KR')}
      {unit}
    </span>
  );
};
