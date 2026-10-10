import { Suspense } from 'react';

import { ArrowRight, BookOpen, ScanSearch, Sparkles } from 'lucide-react';

import { TasteExampleCard } from './TasteExampleCard';

/**
 * 실제 책 표지와 결과지를 함께 보여주는 에디토리얼 취향 분석 섹션.
 * 그라디언트 값은 디자인 시스템이 갖는다(tint-editorial) — 여기 hex 로
 * 박혀 있던 동안 다크에서 이 면만 밝게 남아 대비가 1.07:1 이었다.
 *
 * 홈에서 두 자리에 쓰여 컴포넌트로 뺐다 — 비로그인은 맛보기 바로 아래
 * ("방금 고른 책의 다음 보상"), 로그인은 랭킹 아래.
 */
export const TasteReportSection = () => (
  <section className='tint-editorial overflow-hidden rounded-2xl border border-line-soft p-7 md:p-10'>
    <div className='grid items-center gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14'>
      <div className='max-w-md'>
        <p className='flex items-center gap-2 text-xs font-medium text-primary'>
          <Sparkles aria-hidden='true' className='size-4' />
          PAGE0127 TASTE REPORT
        </p>
        <h2 className='mt-4 text-[28px] font-bold leading-[1.3] text-text-strong md:text-4xl'>
          다섯 권의 책이
          <br />
          <span className='text-primary'>취향의 문장</span>이 됩니다
        </h2>
        <p className='mt-4 max-w-sm break-keep text-base leading-relaxed text-text-body'>
          완독 기록에 반복해서 나타나는 주제와 문장의 결을 읽고, 한 편의 취향
          노트로 정리해 드려요.
        </p>

        <div className='mt-8 flex flex-wrap items-center gap-2 text-xs font-medium text-text-subtle'>
          <span className='tint-chip flex items-center gap-1.5 rounded-full px-3 py-2'>
            <BookOpen aria-hidden='true' className='size-3.5' />
            완독 기록
          </span>
          <ArrowRight
            aria-hidden='true'
            className='size-3.5 text-text-subtle'
          />
          <span className='tint-chip flex items-center gap-1.5 rounded-full px-3 py-2'>
            <ScanSearch aria-hidden='true' className='size-3.5' />
            패턴 분석
          </span>
          <ArrowRight
            aria-hidden='true'
            className='size-3.5 text-text-subtle'
          />
          <span className='tint-chip flex items-center gap-1.5 rounded-full px-3 py-2'>
            <Sparkles aria-hidden='true' className='size-3.5' />
            취향 노트
          </span>
        </div>
      </div>

      <Suspense
        fallback={
          <div className='tint-chip min-h-96 animate-pulse rounded-2xl border border-line-soft' />
        }
      >
        <TasteExampleCard />
      </Suspense>
    </div>
  </section>
);
