'use client';

import Link from 'next/link';

import { Button } from '@repo/ui';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

// 랜딩 히어로의 메인 CTA ("내 책장 만들기")
// - Server Component 인 랜딩 페이지에서 onClick 을 쓰기 위해 Client 로 분리
// - 클릭 시 GA4 이벤트(cta_click + signup_start) 발생
type StartCtaButtonProps = {
  // CTA 위치 구분용 라벨 (히어로/하단 등)
  location: string;
  /** inverse: 어두운 배경(네이비 밴드) 위에서 흰 버튼으로 */
  variant?: 'default' | 'inverse';
};

export const StartCtaButton = ({
  location,
  variant = 'default',
}: StartCtaButtonProps) => {
  const handleClick = () => {
    trackEvent('cta_click', { location, label: '내 책장 만들기' });
    trackEvent('signup_start', { location });
  };

  return (
    <Link href='/login' onClick={handleClick}>
      <Button
        size='lg'
        className={
          /*
            inverse 는 **항상 어두운** 밴드(band-strong) 위에 놓인다. 그래서 버튼은
            모드와 무관하게 흰 바탕 + 어두운 글자여야 한다.

            `text-text-strong` 을 쓰면 안 된다 — 그 토큰은 다크에서 흰색이 되므로
            흰 버튼 위에 흰 글자가 되어 **글자가 통째로 사라진다**(실제로 그랬다).
            면과 글자가 둘 다 모드를 안 타야 하는 자리라 원색을 직접 참조한다.
          */
          variant === 'inverse'
            ? 'bg-white px-8 text-[color:var(--navy-900)] hover:bg-white/90'
            : 'px-8'
        }
      >
        내 책장 만들기
      </Button>
    </Link>
  );
};
