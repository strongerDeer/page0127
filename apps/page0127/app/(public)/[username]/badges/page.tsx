import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageContainer, PageHeader } from '@repo/ui';
import { ChevronLeft } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';
import { getPublicTasteHistory } from '@/entities/taste-analysis/api/getPublicTasteHistory';

import { BadgeCollection } from '@/features/badge';
import { getBadgeActivity } from '@/features/badge/api/getBadgeActivity';

import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ username: string }>;
};

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();
  const name = toDisplayName(profile);
  const title = `${name}님의 배지 책장 | page0127.`;
  const shareTitle = `${name}님의 배지 책장`;
  const description = `${name}님이 책을 읽으며 모은 배지예요. 독서의 순간을 한 권씩 모아요.`;
  // openGraph 를 안 적으면 루트 레이아웃의 홈 문구가 그대로 공유 카드에 실린다
  // (그림은 상위 [username]/opengraph-image 를 물려받는다)
  return {
    title,
    description,
    alternates: { canonical: `/${username}/badges` },
    openGraph: { title: shareTitle, description, type: 'profile' },
    twitter: { card: 'summary_large_image', title: shareTitle, description },
  };
};

/**
 * 뱃지 상세 페이지 (Server Component)
 *
 * 서재 상단 요약 줄의 "전체 보기"로 들어온다. 뱃지는 저장하지 않고 책 기록에서
 * 계산하므로, 서재와 같은 입력(공개 책·독서 목표·첫 취향 분석)만 조회한다.
 * 주인이어도 공개 책만 쓴다 — 서재의 뱃지 줄과 같은 결과여야 한다.
 */
const BadgesPage = async ({ params }: PageProps) => {
  const { username } = await params;
  const supabase = await createClient();

  const [profile, user] = await Promise.all([
    getProfileByUsername(username),
    getCurrentUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const [{ data: books, error }, tasteHistory, badgeActivity] =
    await Promise.all([
      supabase
        .from('books')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_public', true),
      getPublicTasteHistory(profile.id),
      getBadgeActivity(profile.id),
    ]);

  if (error) {
    console.error('뱃지용 책 목록 조회 실패:', error.message);
  }

  const isOwner = user?.id === profile.id;
  const name = isOwner ? '나의' : `${toDisplayName(profile)}님의`;

  return (
    <PageContainer className='space-y-6'>
      <PageHeader
        title={`${name} 배지 책장`}
        // 모으라는 말은 주인에게 하는 말 — 방문자에겐 제목과 배지만 보여 준다
        description={isOwner ? '독서의 순간을 한 권씩 모아요' : undefined}
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
      <BadgeCollection
        activity={badgeActivity}
        username={username}
        isOwner={isOwner}
        books={books ?? []}
        readingGoal={profile.reading_goal ?? null}
        // 이력은 최신순 10건까지라 마지막 것이 가장 오래된 분석이다
        firstTasteAnalysisAt={tasteHistory.at(-1)?.created_at ?? null}
      />
    </PageContainer>
  );
};

export default BadgesPage;
