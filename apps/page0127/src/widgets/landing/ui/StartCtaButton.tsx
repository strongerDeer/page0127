'use client';

import Link from 'next/link';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { Button } from '@/shared/ui/button';

// 랜딩 히어로의 메인 CTA ("내 책장 만들기")
// - Server Component 인 랜딩 페이지에서 onClick 을 쓰기 위해 Client 로 분리
// - 클릭 시 GA4 이벤트(cta_click + signup_start) 발생
type StartCtaButtonProps = {
  // CTA 위치 구분용 라벨 (히어로/하단 등)
  location: string;
};

export const StartCtaButton = ({ location }: StartCtaButtonProps) => {
  const handleClick = () => {
    trackEvent('cta_click', { location, label: '내 책장 만들기' });
    trackEvent('signup_start', { location });
  };

  return (
    <Link href='/login' onClick={handleClick}>
      <Button size='lg' className='px-8'>
        내 책장 만들기
      </Button>
    </Link>
  );
};
