import { Suspense } from 'react';

import { redirect } from 'next/navigation';

import { ErrorBoundary, PageContainer, PageHeader } from '@repo/ui';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { ActivityFeed } from '@/widgets/activity';
import { LoungeLayout, ReadingPrompt } from '@/widgets/lounge';
import {
  ReadingLeagueLoading,
  ReadingLeagueSection,
} from '@/widgets/reading-league';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: '라운지 | page0127.' };

/** 기존 피드 주소를 유지해 알림과 저장된 링크가 계속 연결되게 한다. */
export default async function LoungePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=%2Ffeed');

  return (
    <PageContainer className='space-y-8'>
      <PageHeader
        title='라운지'
        description='서로의 책장이, 다음 한 권의 자극이 되도록.'
      />
      <LoungeLayout
        battle={
          <ErrorBoundary
            fallback={
              <p className='text-sm text-text-subtle'>
                리그를 표시하지 못했어요. 잠시 후 새로고침해 주세요.
              </p>
            }
          >
            <Suspense fallback={<ReadingLeagueLoading />}>
              <ReadingLeagueSection currentUserId={user.id} />
            </Suspense>
          </ErrorBoundary>
        }
        feed={
          <div aria-labelledby='lounge-activity-heading' className='space-y-4'>
            <h2
              id='lounge-activity-heading'
              className='text-lg font-semibold text-text-strong'
            >
              새로운 기록
            </h2>
            <ReadingPrompt />
            <ActivityFeed />
          </div>
        }
      />
    </PageContainer>
  );
}
