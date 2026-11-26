'use client';

import Link from 'next/link';

import { trackEvent } from './trackEvent';

import type { ComponentProps } from 'react';

type CtaLinkProps = ComponentProps<typeof Link> & {
  /** cta_click 의 location — 어드민 유입분석 'CTA 위치별 클릭'에 이 이름으로 쌓인다 */
  location: string;
};

/**
 * 누르면 cta_click 을 보내는 Link. 서버 컴포넌트 안의 버튼도 컴포넌트 전체를
 * 클라이언트로 바꾸지 않고 셀 수 있다(클라이언트 경계는 이 링크 하나).
 */
export const CtaLink = ({ location, onClick, ...props }: CtaLinkProps) => (
  <Link
    {...props}
    onClick={(e) => {
      trackEvent('cta_click', { location });
      onClick?.(e);
    }}
  />
);
