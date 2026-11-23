'use client';

import { type ReactNode, useRef } from 'react';

import { useNearViewport } from '@/shared/lib/hooks/useNearViewport';

type RenderWhenNearProps = {
  children: ReactNode;
  /** 가까워지기 전까지 그릴 자리 표시(차트 높이만큼 잡아 CLS 를 막는다) */
  placeholder: ReactNode;
  /** 바깥 상자 — 관찰 대상이자 크기를 잡는 곳 */
  className?: string;
  /** 화면에서 이만큼 남았을 때 그리기 시작한다. 기본 400px */
  rootMargin?: string;
};

/**
 * 화면 가까이 왔을 때만 children 을 그린다.
 *
 * next/dynamic 은 "언제 불러올지"가 아니라 "따로 쪼갤지"만 정한다. 컴포넌트가
 * 화면 맨 아래에 있어도 hydration 이 끝나면 바로 청크를 받는다. 프로필의 차트
 * 청크(recharts, 압축 104KB)가 그렇게 첫 로드에 끼어 있었다(2026-11-23 실측).
 * children 이 dynamic 컴포넌트면, 여기서 그리기 시작할 때 비로소 청크를 받는다.
 */
export const RenderWhenNear = ({
  children,
  placeholder,
  className,
  rootMargin = '400px 0px',
}: RenderWhenNearProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearViewport(ref, { rootMargin });

  return (
    <div ref={ref} className={className}>
      {near ? children : placeholder}
    </div>
  );
};
