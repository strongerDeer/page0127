'use client';

import { type ComponentProps, useState } from 'react';

import Link from 'next/link';

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof Link>, 'prefetch'>;

/**
 * "가려는 기색"이 보일 때만 prefetch 하는 Link
 *
 * 왜: 기본 Link 는 화면에 보이기만 하면 그 페이지의 RSC 를 미리 받는다.
 * 이 앱의 페이지는 전부 동적 렌더라 prefetch 한 번이 곧 서버 함수 호출이다.
 * 2026-11-11 운영에서 재 보니 GNB·하단 탭처럼 모든 페이지에 깔린 링크가
 * 페이지를 열 때마다 링크당 2번씩 prefetch 되어, 페이지뷰 1번에 함수 호출이 6~10번 더 생겼다
 * (Vercel Hobby Fluid Active CPU 한도 초과의 큰 몫).
 *
 * 어떻게: 처음엔 prefetch={false} 로 두고, 마우스를 올리거나(hover) 손가락이 닿거나(touchstart)
 * 키보드 포커스가 오면 그때 prefetch 를 켠다(null = Next 기본 동작).
 * 클릭 직전 100~300ms 를 미리 쓰는 셈이라 체감 속도는 대부분 유지된다.
 * Next 공식 문서의 "hover 때만 prefetch" 패턴과 같다.
 */
export const IntentPrefetchLink = ({
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...props
}: IntentPrefetchLinkProps) => {
  const [intent, setIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        setIntent(true);
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
    />
  );
};
