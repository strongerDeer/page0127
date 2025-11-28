/*
  홈페이지 (Server Component)

  App Router 파일 구조:
  - app/page.tsx → / 경로
  - app/about/page.tsx → /about 경로

  Server Component 특징:
  - 기본값 (별도 'use client' 지시어 없음)
  - 서버에서만 실행 → DB 접근, API 키 사용 가능
  - SEO 최적화 (HTML이 서버에서 완성되어 전달됨)
  - useState, useEffect 사용 불가 (클라이언트 전용 기능)
*/
export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/*
        디자인 시스템 테스트 섹션
        - section-spacing: globals.css에 정의된 반응형 간격
      */}
      <section className="section-spacing">
        <div className="container mx-auto max-w-5xl px-4">
          {/* H1 테스트 - 반응형 (모바일 36px → 데스크톱 50px) */}
          <h1 className="heading-1 mb-6 text-center">
            당신의 독서 DNA를 발견하세요
          </h1>

          {/* H2 테스트 - 반응형 (모바일 28px → 데스크톱 36px) */}
          <h2 className="heading-2 mb-8 text-center">
            AI 기반 독서 성향 분석 플랫폼
          </h2>

          {/* 컬러 시스템 테스트 */}
          <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Primary 컬러 (Gold) */}
            <div className="rounded-lg bg-primary p-6 text-center">
              <p className="font-bold text-secondary">Primary (Gold)</p>
              <p className="text-sm text-secondary">#FFD700</p>
            </div>

            {/* Secondary 컬러 (Dark) */}
            <div className="rounded-lg bg-secondary p-6 text-center">
              <p className="font-bold text-white">Secondary (Dark)</p>
              <p className="text-sm text-white">#2D3748</p>
            </div>

            {/* Accent 컬러 (Purple) */}
            <div className="rounded-lg bg-accent p-6 text-center">
              <p className="font-bold text-white">Accent (Purple)</p>
              <p className="text-sm text-white">#9F7AEA</p>
            </div>
          </div>

          {/* CTA 버튼 테스트 */}
          <div className="flex justify-center gap-4">
            <button className="rounded-full bg-primary px-8 py-3 font-bold text-secondary transition-opacity hover:opacity-90">
              무료로 시작하기
            </button>

            <button className="rounded-full border-2 border-secondary px-8 py-3 font-bold text-secondary transition-colors hover:bg-secondary hover:text-white">
              더 알아보기
            </button>
          </div>

          {/* 설명 */}
          <div className="mt-12 rounded-lg bg-gray-50 p-6">
            <h3 className="mb-4 text-xl font-bold">✅ 초기 세팅 완료!</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Turborepo 모노레포 구조</li>
              <li>✓ Next.js 14 + App Router</li>
              <li>✓ TypeScript + Tailwind CSS</li>
              <li>✓ 디자인 시스템 (컬러, 타이포그래피)</li>
            </ul>
            <p className="mt-4 text-sm text-gray-500">
              다음 단계: 홈페이지 섹션별 구현 (Hero, Features, Social Proof,
              Footer)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
