import Link from 'next/link';

// 사이트 공통 푸터
// - 랜딩 페이지 하단에 노출
// - 정책/소개 링크는 각 정적 페이지로 연결 (현재는 "준비 중" 페이지)
const footerLinks = [
  { href: '/about', label: '소개' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/terms', label: '이용약관' },
  { href: '/contact', label: '문의' },
];

export const SiteFooter = () => {
  return (
    <footer className='border-t border-border bg-card py-8'>
      <div className='container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground'>
        {/* aria-label: 여러 nav 중 푸터 링크임을 스크린 리더에 구분 */}
        <nav
          aria-label='푸터 링크'
          className='mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2'
        >
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className='transition-colors hover:text-foreground'
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className='mb-2'>읽은 책이 모여 책장이 됩니다.</p>
        <p>© 2026 page0127. All rights reserved.</p>
      </div>
    </footer>
  );
};
