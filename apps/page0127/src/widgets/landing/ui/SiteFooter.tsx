import Link from 'next/link';

// 사이트 공통 푸터
//
// '문의'는 창구가 정해질 때까지 빼 둔다 — "준비 중" 페이지를 링크하는 건
// 방문자에게 "이건 미완성 데모"라고 자백하는 것과 같다.
// (siteInfo.ts 의 TODO 참조)
const footerLinks = [
  { href: '/books/all', label: '전체 도서' },
  { href: '/about', label: '소개' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/terms', label: '이용약관' },
];

export const SiteFooter = () => {
  return (
    <footer className='border-t border-line bg-card'>
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

        <p className='mt-8 border-t border-line-soft pt-6 text-xs text-text-faint'>
          © 2026 page0127
        </p>
      </div>
    </footer>
  );
};
