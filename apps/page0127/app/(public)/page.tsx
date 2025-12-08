import Link from 'next/link';

import { Button } from '@/shared/ui/button';

/**
 * 메인 랜딩 페이지
 *
 * 학습 포인트:
 * - Server Component (기본값)
 * - 반응형 디자인 (모바일 → 태블릿 → 데스크톱)
 * - Tailwind CSS 유틸리티 클래스 활용
 */
const Home = () => {
  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <section className='section-spacing'>
        <div className='container mx-auto max-w-5xl px-4'>
          <div className='text-center'>
            {/* 메인 헤딩 */}
            <h1 className='heading-1 mb-6'>당신의 독서 DNA를 발견하세요</h1>

            {/* 서브 헤딩 */}
            <p className='heading-2 mb-12 text-gray-600'>
              AI 기반 독서 성향 분석 플랫폼
            </p>

            {/* CTA 버튼 */}
            <div className='flex justify-center gap-4'>
              <Link href='/login'>
                <Button size='lg' className='px-8'>
                  무료로 시작하기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='section-spacing bg-gray-50'>
        <div className='container mx-auto max-w-5xl px-4'>
          <h2 className='heading-2 mb-12 text-center'>주요 기능</h2>

          {/* 기능 카드 그리드 */}
          <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
            {/* 독서 기록 */}
            <div className='rounded-lg bg-white p-6 shadow-sm'>
              <div className='mb-4 text-4xl'>📚</div>
              <h3 className='mb-2 text-xl font-bold'>독서 기록</h3>
              <p className='text-gray-600'>
                읽은 책을 기록하고 통계를 확인하세요
              </p>
            </div>

            {/* AI 분석 */}
            <div className='rounded-lg bg-white p-6 shadow-sm'>
              <div className='mb-4 text-4xl'>🤖</div>
              <h3 className='mb-2 text-xl font-bold'>AI 분석</h3>
              <p className='text-gray-600'>
                독서 성향을 분석하고 맞춤 추천을 받으세요
              </p>
            </div>

            {/* 목표 관리 */}
            <div className='rounded-lg bg-white p-6 shadow-sm'>
              <div className='mb-4 text-4xl'>🎯</div>
              <h3 className='mb-2 text-xl font-bold'>목표 관리</h3>
              <p className='text-gray-600'>
                연간 독서 목표를 설정하고 달성하세요
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t bg-white py-8'>
        <div className='container mx-auto max-w-5xl px-4 text-center text-sm text-gray-600'>
          <p>© 2024 page0127. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
