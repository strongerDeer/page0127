'use client';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { countBannerClick } from '@/entities/banner/api/countBannerClick';

type BeltLinkProps = {
  slideId: string;
  href: string;
  cta: string;
  className: string;
  /** 기념일 띠지 색(--belt·--belt-ink) */
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * 어드민 배너를 단 띠지 — 띠지 전체가 링크다.
 * 예전 배너 캐러셀(HeroBanner)과 같은 두 가지를 센다: GA cta_click(+슬라이드 id)과 어드민 클릭 수.
 */
export const BeltLink = ({
  slideId,
  href,
  cta,
  className,
  style,
  children,
}: BeltLinkProps) => (
  <a
    href={href}
    className={className}
    style={style}
    onClick={() => {
      trackEvent('cta_click', {
        location: 'cover_belt',
        label: cta,
        slide_id: slideId,
      });
      countBannerClick(slideId);
    }}
  >
    {children}
  </a>
);
