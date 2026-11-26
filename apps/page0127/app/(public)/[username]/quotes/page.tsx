import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PageContainer, PageHeader } from '@repo/ui';
import { ChevronLeft, Lock } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getDailySentences } from '@/entities/daily-sentence';
import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';
import { getQuoteShelf } from '@/entities/quote';

import { DailySentenceHistory } from '@/widgets/quote/ui/DailySentenceHistory';
import { MyQuotesList } from '@/widgets/quote/ui/MyQuotesList';
import { QuoteShelfTabs } from '@/widgets/quote/ui/QuoteShelfTabs';

import type { QuoteShelfTab } from '@/widgets/quote/ui/QuoteShelfTabs';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

// 나만 보는 페이지 — 검색에 걸릴 이유가 없다
export const metadata: Metadata = {
  title: '문장 서랍 | page0127.',
  robots: { index: false, follow: false },
};

/**
 * 문장 서랍 (Server Component) — 주인만.
 *
 * 서재 독서 캘린더 패널에는 내가 모은 문장이 무작위로 하나만 나온다(HJ B안, 2026-11-10).
 * 그동안 모은 문장을 한곳에서 보는 자리가 여기다.
 *  - 내가 적은 문장: 책별 묶음(book_quotes, 계정+ISBN)
 *  - 오늘의 문장 기록: 펼친 날짜순(sentence_draws)
 *
 * 두 탭 데이터를 한 번에 읽는다 — 둘 다 많아야 수백 줄이고, 탭 개수를 보여 주려면
 * 어차피 둘 다 필요하다. 남이 들어오면 그 사람 서재로 돌려보낸다(두 테이블 모두
 * RLS 가 본인 행만 열어 주므로, 막지 않아도 남의 문장은 새지 않는다 — 다층 방어).
 */
const QuotesPage = async ({ params, searchParams }: PageProps) => {
  const [{ username }, { tab }] = await Promise.all([params, searchParams]);

  const [profile, user] = await Promise.all([
    getProfileByUsername(username),
    getCurrentUser(),
  ]);

  if (!profile) notFound();
  if (user?.id !== profile.id) redirect(`/${username}`);

  const supabase = await createClient();
  const [groups, draws] = await Promise.all([
    getQuoteShelf(supabase, profile.id),
    getDailySentences(supabase, profile.id),
  ]);

  const current: QuoteShelfTab = tab === 'daily' ? 'daily' : 'mine';
  const quoteCount = groups.reduce((sum, g) => sum + g.quotes.length, 0);

  return (
    <PageContainer className='space-y-6'>
      <PageHeader
        title='문장 서랍'
        description={
          <span className='inline-flex items-center gap-1'>
            <Lock className='size-3.5' aria-hidden />
            나만 보여요
          </span>
        }
        above={
          <Link
            href={`/${username}`}
            className='inline-flex items-center gap-0.5 text-sm text-text-subtle hover:text-text-strong'
          >
            <ChevronLeft className='size-4' aria-hidden />
            서재로
          </Link>
        }
      />

      <QuoteShelfTabs
        username={username}
        current={current}
        mineCount={quoteCount}
        dailyCount={draws.length}
      />

      {current === 'mine' ? (
        <MyQuotesList username={username} groups={groups} />
      ) : (
        <DailySentenceHistory draws={draws} />
      )}
    </PageContainer>
  );
};

export default QuotesPage;
