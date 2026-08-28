import Link from 'next/link';

import { cn } from '@repo/ui';

/**
 * 사이트 공통 푸터 — **모든 화면**에 붙는다(앱 셸이 렌더한다).
 *
 * 로그인 전 화면에만 두면 안 된다. 쓰다가 막힌 사람은 로그인한 상태이고,
 * 그때 문의할 곳이 화면에 없으면 대부분 말없이 떠난다. 개인정보처리방침·
 * 이용약관도 같은 이유로 로그인 후에 닿아야 한다.
 */
const footerLinks = [
  { href: '/books/all', label: '전체 도서' },
  { href: '/about', label: '소개' },
  { href: '/contact', label: '문의' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/terms', label: '이용약관' },
];

type SiteFooterProps = {
  /** 모바일 하단 탭바에 가리지 않도록 아래 여백을 더할 때 쓴다 */
  className?: string;
};

export const SiteFooter = ({ className }: SiteFooterProps) => {
  return (
    <footer className={cn('border-t border-line bg-card', className)}>
      <div className='mx-auto max-w-6xl px-4 py-10'>
        <div className='flex flex-col gap-6 md:flex-row md:items-start md:justify-between'>
          <div>
            <p className='text-base font-bold text-primary'>page0127</p>
            <p className='mt-2 text-sm text-text-subtle'>
              읽은 책이 모여 책장이 됩니다.
            </p>
          </div>

          {/* aria-label: 여러 nav 중 푸터 링크임을 스크린 리더에 구분 */}
          <nav
            aria-label='푸터 링크'
            className='flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-subtle'
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className='transition-colors hover:text-text-strong'
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/*
          베타 고지는 푸터에 둔다 — 이제 모든 화면에 붙고, 무엇보다
          **문의 링크 바로 옆**이다. "이상하면 말해 달라"와 "말하는 방법"이
          떨어져 있으면 둘 다 소용이 없다.
          정식 오픈 때 이 문단만 지운다.
        */}
        <div className='mt-8 border-t border-line-soft pt-6'>
          <p className='text-xs text-text-subtle'>
            page0127 은 지금 베타 서비스입니다. 기능과 화면이 예고 없이 바뀔 수
            있어요. 이상한 점을 발견하면{' '}
            <Link href='/contact' className='underline hover:text-text-strong'>
              문의
            </Link>
            로 알려 주시면 큰 도움이 됩니다.
          </p>
          <p className='mt-3 text-xs text-text-subtle'>© 2026 page0127</p>
        </div>
      </div>
    </footer>
  );
};
