import { ChevronDown } from 'lucide-react';

import {
  LITTLE_PRINCE_FACTS,
  LITTLE_PRINCE_FAMOUS,
  LITTLE_PRINCE_FAQ,
  LITTLE_PRINCE_INTRO,
} from '@/entities/typing';

/**
 * 『어린 왕자』는 어떤 책인가 + 자주 묻는 질문 (서버 컴포넌트)
 *
 * 검색으로 들어온 사람이 "무슨 페이지인지"를 바로 알 수 있게, 그리고 검색엔진이 읽을 글이
 * 처음 HTML 에 들어 있게 둔다. FAQ 는 <details> 로 접어도 답이 HTML 에 있다(JSON-LD 와 같은 배열).
 */
export const TypingBookIntro = () => (
  <section
    aria-labelledby='typing-book-intro'
    className='grid gap-6 rounded-2xl border border-line-soft bg-card p-5 sm:p-8 md:grid-cols-[1.4fr_1fr]'
  >
    <div className='flex flex-col gap-4'>
      <h2
        id='typing-book-intro'
        className='text-xl font-bold text-text-strong sm:text-2xl'
      >
        『어린 왕자』는 어떤 책인가요
      </h2>
      {LITTLE_PRINCE_INTRO.map((p) => (
        <p key={p} className='text-[15px] leading-relaxed text-text-body'>
          {p}
        </p>
      ))}
      <dl className='mt-1 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-sunken p-4 text-sm'>
        {LITTLE_PRINCE_FACTS.map((f) => (
          <div key={f.label}>
            <dt className='text-xs text-text-subtle'>{f.label}</dt>
            <dd className='mt-0.5 font-bold text-text-strong'>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>

    <div className='flex flex-col gap-3'>
      <h3 className='text-base font-bold text-text-strong'>
        필사로 만나는 명문장
      </h3>
      <ul className='flex flex-col gap-2'>
        {LITTLE_PRINCE_FAMOUS.map((f) => (
          <li
            key={f.id}
            className='rounded-xl border border-line-soft px-4 py-3 text-sm'
          >
            <span className='text-xs font-bold text-primary'>
              {f.chapter} · {f.label}
            </span>
            <p className='mt-1 line-clamp-2 leading-relaxed text-text-body'>
              {f.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export const TypingFaq = () => (
  <section aria-labelledby='typing-faq' className='flex flex-col gap-4'>
    <h2 id='typing-faq' className='text-xl font-bold text-text-strong'>
      자주 묻는 질문
    </h2>
    <div className='divide-y divide-line-soft rounded-2xl border border-line-soft bg-card'>
      {LITTLE_PRINCE_FAQ.map((faq, i) => (
        <details key={faq.question} className='group' open={i === 0}>
          <summary className='flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-text-strong [&::-webkit-details-marker]:hidden'>
            {faq.question}
            <ChevronDown
              aria-hidden
              className='size-4 shrink-0 text-text-subtle transition-transform group-open:rotate-180'
            />
          </summary>
          <p className='px-5 pb-5 text-sm leading-relaxed text-text-body'>
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  </section>
);
