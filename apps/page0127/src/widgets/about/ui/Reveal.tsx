'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

type RevealProps = {
  children: React.ReactNode;
  /** 같은 섹션 안에서 순서대로 나타나게 하는 지연 단계 (0.1초 단위) */
  delay?: 0 | 1 | 2 | 3;
  className?: string;
};

const DELAY = ['', 'delay-100', 'delay-200', 'delay-300'] as const;

/**
 * 화면에 들어올 때 아래에서 올라오며 나타난다.
 *
 * 서버 HTML 은 **보이는 상태**로 그린다. 마운트했을 때 이미 화면 안이면 그대로 두고,
 * 화면 밖일 때만 숨겼다가 들어올 때 꺼낸다 — 첫 화면(히어로 제목)이 JS 를 기다리며
 * 투명하게 시작하면 LCP 가 늦어진다.
 */
export const Reveal = ({ children, delay = 0, className }: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    // 화면 밖에서 시작하는 요소만 숨겼다가 꺼낸다 — 마운트 직후 한 번뿐이다
    setState('hidden');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState('shown');
        io.disconnect();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition duration-700 ease-out motion-reduce:transition-none',
        DELAY[delay],
        state === 'hidden' &&
          'translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100',
        className
      )}
    >
      {children}
    </div>
  );
};
