import Link from 'next/link';

import { CoverImage } from '@repo/ui';
import { ChevronRight } from 'lucide-react';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { toCoverSource } from '@/entities/book';
import { getRecapBooks, selectRecapCard } from '@/entities/recap';

import { RecapRating } from './RecapRating';

import type { RecapCard } from '@/entities/recap';

/**
 * 주간 회상 — "이번 주의 한 장".
 *
 * 이번 주에 할 말이 있는 카드 1장만 그린다. 할 말이 없으면 아무것도 그리지 않는다.
 * "이번 주 0권 완독" 같은 문구는 살아 있는 서비스가 아니라 죽은 서비스라는 자백이 된다.
 * (00_docs/00_남은_작업_목록.md 의 금지 원칙 — TodayStrip 과 같은 이유)
 *
 * 저장하는 데이터가 없다. 열 때마다 계산하지만 우선순위가 고정이라 같은 주에는
 * 항상 같은 카드가 나온다.
 */

/** 카드 종류별 제목. N권은 대표 1권 + 나머지 */
const toHeading = (card: RecapCard, count: number): string => {
  switch (card.kind) {
    case 'this-week':
      return card.variant === 'completed'
        ? `이번 주에 ${count}권을 끝내셨어요`
        : `이번 주에 ${count}권을 담으셨어요`;
    case 'years-ago':
      return `${card.yearsAgo}년 전 이맘때, 이런 책을 읽으셨어요`;
    case 'still-reading':
      return '아직 읽고 계신 책이에요';
  }
};

/** 'YYYY-MM-DD' → '2025년 7월 28일' */
const toKoreanDate = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-');
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
};

/**
 * others 꼬리표 — still-reading 은 "주"와 무관하다.
 *
 * this-week·years-ago 의 others 는 실제로 그 주(또는 그 주의 n년 전)에 걸린
 * 책들이지만, still-reading 의 others 는 그냥 다른 읽는 중인 책이다. 셋 다
 * "같은 주에 N권 더"로 뭉뚱그리면 still-reading 카드에서 없는 사실을 적게 된다.
 */
const toTailLabel = (kind: RecapCard['kind'], count: number): string =>
  kind === 'still-reading'
    ? `같이 읽고 계신 책 ${count}권`
    : `같은 주에 ${count}권 더`;

/** 대표 책 아래 한 줄 — 카드마다 다른 근거를 적는다 */
const toLeadMeta = (card: RecapCard): string | null => {
  const { lead } = card;

  if (card.kind === 'still-reading') return '읽는 중';
  if (card.kind === 'this-week' && card.variant === 'added')
    return '이번 주에 담음';
  if (lead.completed_date) return `${toKoreanDate(lead.completed_date)} 완독`;

  return null;
};

export const WeeklyRecapCard = async () => {
  const user = await getCurrentUser();

  // 회상은 내 기록을 되돌아보는 자리라 로그인 사용자에게만 보인다
  if (!user) return null;

  const card = selectRecapCard(await getRecapBooks(user.id), new Date());

  // 할 말이 없으면 침묵한다
  if (!card) return null;

  const count = 1 + card.others.length;
  const meta = toLeadMeta(card);

  return (
    <section
      aria-labelledby='weekly-recap-heading'
      className='rounded-xl border border-line px-7 py-6'
    >
      <div className='flex items-baseline justify-between gap-3'>
        <h2
          id='weekly-recap-heading'
          className='text-sm font-bold text-text-strong'
        >
          {toHeading(card, count)}
        </h2>
        <Link
          href='/books/recap'
          className='inline-flex shrink-0 items-center text-xs text-text-subtle hover:text-text-strong'
        >
          지난 회상
          <ChevronRight className='size-3.5' aria-hidden />
        </Link>
      </div>

      <div className='mt-4 flex items-start gap-4'>
        {/* 표지를 끝내 못 불러오면 아무것도 그리지 않는다(fallback 기본값) */}
        <CoverImage
          {...toCoverSource(card.lead)}
          alt=''
          width={120}
          height={174}
          className='book-cover h-28 w-auto shrink-0 rounded-md'
        />

        <div className='pt-1'>
          <p className='text-lg font-bold leading-snug text-text-strong'>
            {card.lead.title}
          </p>

          <p className='mt-1 text-sm text-text-subtle'>
            {[card.lead.author, meta].filter(Boolean).join(' · ')}
          </p>

          <RecapRating
            rating={card.lead.rating}
            isLifeBook={card.lead.is_life_book}
          />
        </div>
      </div>

      {card.others.length > 0 && (
        <p className='mt-4 line-clamp-1 break-keep text-sm text-text-body'>
          {`${toTailLabel(card.kind, card.others.length)} — `}
          {card.others.map((book) => book.title).join(' · ')}
        </p>
      )}
    </section>
  );
};
