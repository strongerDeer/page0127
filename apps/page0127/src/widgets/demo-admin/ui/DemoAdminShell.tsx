import Link from 'next/link';

import { ArrowLeft, Gauge, LayoutDashboard, LineChart } from 'lucide-react';

import { DemoAdminNavLink } from './DemoAdminNavLink';

import type { ReactNode } from 'react';

/**
 * 체험 계정용 데모 어드민 틀 — 맨 위 빨간 "예시 데이터" 띠 + 메뉴 3칸 + 본문.
 *
 * 실제 운영 콘솔((admin)/layout.tsx)과 같은 배치지만 코드는 따로다.
 * 실제 레이아웃은 assertAdmin·메뉴 배지(DB 조회)를 부르므로 데모가 빌려 쓰면 안 된다.
 * 회원·신고·도서 검수·에러·AI 비용·콘텐츠 편집은 개인정보·운영 작업이라 메뉴에서 뺐다.
 */
const NAV = [
  { href: '/demo/admin/analytics', label: '유입분석', icon: LineChart },
  { href: '/demo/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/demo/admin/quality', label: '품질', icon: Gauge },
] as const;

export const DemoAdminShell = ({ children }: { children: ReactNode }) => (
  <div className='flex min-h-screen flex-col'>
    {/* 스크롤해도 따라오는 빨간 띠 — 어느 화면을 캡처해도 예시라는 게 보이게 */}
    <div
      role='note'
      className='sticky top-0 z-30 bg-red-600 text-white shadow-sm dark:bg-red-700'
    >
      <div className='page-width flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm break-keep'>
        <p className='font-bold'>
          <span aria-hidden className='mr-1.5'>
            ●
          </span>
          예시 데이터
        </p>
        {/* 폰에서는 띠가 화면을 많이 가리지 않게 짧은 문장만 */}
        <p className='min-w-0 flex-1 text-white/90'>
          <span className='sm:hidden'>실제 숫자가 아니에요.</span>
          <span className='hidden sm:inline'>
            실제 회원·방문 숫자가 아니에요. page0127. 운영 화면을 구경용 예시
            숫자로 보여 드려요.
          </span>
        </p>
        <Link
          href='/'
          className='inline-flex items-center gap-1 font-medium underline underline-offset-4'
        >
          <ArrowLeft aria-hidden className='size-3.5' />
          서비스로 돌아가기
        </Link>
      </div>
    </div>

    <div className='page-width flex flex-1 flex-col md:flex-row'>
      <aside className='border-b border-line md:w-56 md:shrink-0 md:border-b-0 md:border-r'>
        <div className='border-b border-line px-4 py-3 text-sm font-medium md:py-4'>
          운영 콘솔{' '}
          <span className='text-xs font-normal text-red-600 dark:text-red-400'>
            (예시)
          </span>
        </div>
        <nav
          aria-label='운영 콘솔 메뉴(예시)'
          className='flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-4'
        >
          {NAV.map((item) => (
            <DemoAdminNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<item.icon className='h-4 w-4' aria-hidden />}
            />
          ))}
        </nav>
        <p className='hidden px-4 pb-4 text-xs leading-relaxed text-text-subtle md:block'>
          회원 관리·신고·도서 검수처럼 개인정보나 운영 작업이 있는 화면은
          예시에서 뺐어요.
        </p>
      </aside>
      <main className='min-w-0 flex-1 p-4 md:p-6'>{children}</main>
    </div>
  </div>
);
