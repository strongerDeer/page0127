import Link from 'next/link';

import { Lock } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';

import { getRandomQuote } from '@/entities/quote';

type RandomQuoteCardProps = {
  /** 책 상세 링크(/아이디/책ID)를 만들 서재 주인 아이디 */
  username: string;
};

/**
 * 서재(프로필)의 "간직한 문장" 한 장 — 내가 적은 책 문장 중 하나를 무작위로.
 *
 * 나만 본다(HJ, 2026-11-09): 페이지가 주인일 때만 이 카드를 넣고, RPC 도 RLS 로
 * 본인 문장만 후보로 삼는다. 문장이 하나도 없으면 아무것도 그리지 않는다 —
 * "아직 문장이 없어요" 같은 빈 카드로 서재 위쪽을 차지하지 않는다.
 *
 * Server Component 라 매 요청마다 서버가 하나를 골라 HTML 로 보낸다.
 * (클라이언트에서 고르면 서버 HTML 과 달라져 hydration 불일치가 난다)
 */
export const RandomQuoteCard = async ({ username }: RandomQuoteCardProps) => {
  const quote = await getRandomQuote(await createClient());
  if (!quote) return null;

  const source = [
    quote.title && `《${quote.title}》`,
    quote.page && `p. ${quote.page}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section
      aria-labelledby='random-quote-heading'
      className='rounded-xl border border-line px-7 py-6'
    >
      <div className='flex items-baseline justify-between gap-3'>
        <h2
          id='random-quote-heading'
          className='text-sm font-bold text-text-strong'
        >
          간직한 문장
        </h2>
        <span className='inline-flex items-center gap-1 text-xs text-text-subtle'>
          <Lock className='size-3' aria-hidden />
          나만 보여요
        </span>
      </div>

      <blockquote className='mt-4 whitespace-pre-wrap break-keep text-lg font-bold leading-relaxed text-text-strong'>
        {quote.text}
      </blockquote>

      {source &&
        (quote.book_id ? (
          <Link
            href={`/${username}/${quote.book_id}`}
            className='mt-3 inline-block text-sm text-text-subtle hover:text-text-strong'
          >
            {source}
          </Link>
        ) : (
          <p className='mt-3 text-sm text-text-subtle'>{source}</p>
        ))}
    </section>
  );
};
