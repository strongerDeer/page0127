import { ArrowUpRight, ChevronDown } from 'lucide-react';

import {
  LITTLE_PRINCE_FACTS,
  LITTLE_PRINCE_FAQ,
  LITTLE_PRINCE_INTRO,
  LITTLE_PRINCE_STORE_URL,
} from '@/entities/typing';

/**
 * 『어린 왕자』 책 정보 + 자주 묻는 질문 한 카드 (서버 컴포넌트) — 짧게(HJ 11/25 "너무 긴가..?").
 *
 * 소개 두 줄 + 기본 정보 + 서점 링크. 검색엔진이 읽을 글은 이 카드와 FAQ 가 맡는다.
 * 서점 링크(LITTLE_PRINCE_STORE_URL)가 비어 있으면 버튼을 그리지 않는다.
 */
export const TypingBookIntro = () => (
  <section
    aria-labelledby='typing-book-intro'
    className='flex flex-col gap-4 rounded-2xl border border-line-soft bg-card p-5 sm:p-6'
  >
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8'>
      <div className='flex flex-col gap-2'>
        <h2
          id='typing-book-intro'
          className='text-lg font-bold text-text-strong'
        >
          『어린 왕자』는 어떤 책인가요
        </h2>
        <p className='text-sm leading-relaxed text-text-body'>
          {LITTLE_PRINCE_INTRO}
        </p>
        <dl className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-subtle'>
          {LITTLE_PRINCE_FACTS.map((f) => (
            <div key={f.label} className='flex gap-1'>
              <dt>{f.label}</dt>
              <dd className='font-bold text-text-body'>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {LITTLE_PRINCE_STORE_URL && (
        <a
          href={LITTLE_PRINCE_STORE_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-line-soft bg-card px-4 py-2.5 text-sm font-bold text-text-strong hover:bg-accent'
        >
          YES24에서 보기
          <ArrowUpRight aria-hidden className='size-4' />
        </a>
      )}
    </div>

    {/* 자주 묻는 질문 — 다 접어 둔다. 답은 처음 HTML 에 있어 검색엔진은 읽는다(JSON-LD 와 같은 배열) */}
    <div className='border-t border-line-soft pt-2'>
      <h3 className='sr-only'>자주 묻는 질문</h3>
      {LITTLE_PRINCE_FAQ.map((faq) => (
        <details key={faq.question} className='group'>
          <summary className='flex cursor-pointer list-none items-center justify-between gap-4 py-2.5 text-sm text-text-body hover:text-text-strong [&::-webkit-details-marker]:hidden'>
            {faq.question}
            <ChevronDown
              aria-hidden
              className='size-4 shrink-0 text-text-subtle transition-transform group-open:rotate-180'
            />
          </summary>
          <p className='pb-3 text-sm leading-relaxed text-text-subtle'>
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  </section>
);
