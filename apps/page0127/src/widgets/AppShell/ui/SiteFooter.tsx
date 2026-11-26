import Link from 'next/link';

import { cn } from '@repo/ui';

import { INSTAGRAM_URL } from '@/shared/config/social';

/**
 * 사이트 공통 푸터 — **모든 화면**에 붙는다(앱 셸이 렌더한다).
 *
 * 로그인 전 화면에만 두면 안 된다. 쓰다가 막힌 사람은 로그인한 상태이고,
 * 그때 문의할 곳이 화면에 없으면 대부분 말없이 떠난다. 개인정보처리방침·
 * 이용약관도 같은 이유로 로그인 후에 닿아야 한다.
 */
// 링크가 9개로 늘어 한 줄이 꽉 차서 묶음 셋으로 나눴다(2026-11-26 HJ A안, 묶음마다 한 줄).
// 개인정보처리방침·이용약관은 법적으로 닿아야 하지만 자주 누르지 않아 맨 아래 © 줄로 내렸다.
const footerGroups = [
  {
    title: '둘러보기',
    links: [
      { href: '/about', label: '서비스 소개' },
      { href: '/books/all', label: '전체 도서' },
      { href: '/blog', label: '책 이야기' },
    ],
  },
  {
    title: '하루 한 번',
    links: [
      // 가로채기 라우트(서재 배너용 모달)를 피해 페이지로 — 메뉴는 그곳으로 가는 길이라(2026-11-26 HJ)
      { href: '/sentence', label: '오늘의 문장', fullPageLoad: true },
      { href: '/typing/little-prince', label: '온라인 필사' },
    ],
  },
  {
    title: '도움말',
    links: [
      { href: '/updates', label: '공지·업데이트' },
      { href: '/contact', label: '문의' },
    ],
  },
];

const legalLinks = [
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/terms', label: '이용약관' },
];

/**
 * 인스타그램 로고 — lucide-react 1.x는 브랜드 아이콘을 빼서 직접 그린다.
 * 장식용이라 aria-hidden, 링크 이름은 옆 글자(sr-only 아님)가 맡는다.
 */
const InstagramIcon = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    strokeLinecap='round'
    strokeLinejoin='round'
    className='size-4'
  >
    <rect x='2' y='2' width='20' height='20' rx='5' />
    <circle cx='12' cy='12' r='4' />
    <circle cx='17.5' cy='6.5' r='0.5' fill='currentColor' />
  </svg>
);

type SiteFooterProps = {
  /** 모바일 하단 탭바에 가리지 않도록 아래 여백을 더할 때 쓴다 */
  className?: string;
};

export const SiteFooter = ({ className }: SiteFooterProps) => {
  return (
    <footer className={cn('border-t border-line bg-card', className)}>
      <div className='page-width py-10'>
        <div className='flex flex-col gap-10 md:flex-row md:items-start md:justify-between'>
          <div>
            <p className='text-base font-bold text-primary'>page0127.</p>
            <p className='mt-2 text-sm text-text-subtle'>
              읽은 책이 모여 책장이 됩니다.
            </p>
            {/* 외부 링크: 새 탭 + noopener(열린 창이 window.opener로 이 페이지를 조작하지 못하게) */}
            <a
              href={INSTAGRAM_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-4 inline-flex items-center gap-1.5 text-sm text-text-subtle transition-colors hover:text-text-strong'
            >
              <InstagramIcon />
              인스타그램
            </a>
          </div>

          {/* aria-label: 여러 nav 중 푸터 링크임을 스크린 리더에 구분 */}
          <nav
            aria-label='푸터 링크'
            // 묶음마다 한 줄(제목 아래 링크를 | 로 이어서) — 3열은 폴더블 접은 화면(280px)에서 빠듯해서(2026-11-26 HJ)
            className='flex flex-col gap-5'
          >
            {footerGroups.map((group) => (
              <div key={group.title}>
                <p className='text-sm font-semibold text-text-strong'>
                  {group.title}
                </p>
                {/*
                  칸이 모자라면 링크 단위로 줄이 바뀐다(whitespace-nowrap — 글자 중간에서 안 끊기게).
                  구분선은 모든 링크 앞에 두고, 목록을 왼쪽으로 24px 당긴 뒤 바깥 칸에서 잘라 낸다 →
                  줄 맨 앞에 오는 구분선은 늘 잘려서 "| 책 이야기"처럼 보이지 않는다(폴더블 280px).
                */}
                <div className='mt-2 overflow-hidden'>
                  <ul className='-ml-6 flex flex-wrap items-center gap-y-1 text-sm text-text-subtle'>
                    {group.links.map((link) => (
                      <li key={link.href} className='flex items-center'>
                        <span
                          aria-hidden='true'
                          className='mx-3 h-3 w-px shrink-0 bg-line'
                        />
                        {'fullPageLoad' in link && link.fullPageLoad ? (
                          <a
                            href={link.href}
                            className='whitespace-nowrap transition-colors hover:text-text-strong'
                          >
                            {link.label}
                          </a>
                        ) : (
                        <Link
                          // 목록 링크는 미리 불러오지 않는다 (Vercel CPU — 00_docs 남은 작업 참고)
                          prefetch={false}
                          href={link.href}
                          className='whitespace-nowrap transition-colors hover:text-text-strong'
                        >
                          {link.label}
                        </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/*
          피드백 안내는 푸터에 둔다 — 모든 화면에 붙고, 무엇보다
          **문의 링크 바로 옆**이다. "이상하면 말해 달라"와 "말하는 방법"이
          떨어져 있으면 둘 다 소용이 없다.
          (베타 고지는 2026-11-24 HJ 결정으로 뺐다 — 안내 문장만 남김)
        */}
        <div className='mt-8 border-t border-line-soft pt-6'>
          <p className='text-xs text-text-subtle'>
            이상한 점을 발견하면{' '}
            <Link
              // 목록 링크는 미리 불러오지 않는다 (Vercel CPU — 00_docs 남은 작업 참고)
              prefetch={false}
              href='/contact'
              className='underline hover:text-text-strong'
            >
              문의
            </Link>
            로 알려 주시면 큰 도움이 됩니다.
          </p>
          <div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle'>
            <p>© 2026 page0127.</p>
            <nav aria-label='약관' className='flex items-center gap-3'>
              {legalLinks.map((link) => (
                <Link
                  prefetch={false}
                  key={link.href}
                  href={link.href}
                  className='underline-offset-2 transition-colors hover:text-text-strong hover:underline'
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};
