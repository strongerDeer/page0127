'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, isPreOptimizedImageSrc } from '@repo/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import {
  MONTHLY_LIMIT,
  USAGE_LIMIT_EXCEEDED_MESSAGE,
} from '@/shared/lib/aiUsage';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { TASTE_ANALYSIS_MIN_BOOKS } from '@/entities/taste-analysis/model/analysisGate';

import { FollowButton, FollowListModal, FollowStats } from '@/features/follow';
import { coachTarget } from '@/features/onboarding';
import { ShareButton } from '@/features/share';
import { TasteProfileCard } from '@/features/taste-analysis/ui/TasteProfileCard';

import type { PublicTasteHistoryItem } from '@/entities/taste-analysis/types';

type Profile = {
  id: string;
  nickname: string | null;
  bio: string | null;
  photo_url: string | null;
};

type PublicLibraryHeaderProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  /** 취향 분석 가능한 책 권수 (평가를 남긴 완독 책) — 소유자 전용, 방문자는 0 */
  analyzableBookCount: number;
  /** 마지막 분석 이후 새로 추가된 분석 가능 책 권수 — 분석 이력이 없으면 null */
  newBooksSinceLastAnalysis: number | null;
  /** 취향 분석 이력 (최신순 최대 10건) — 공개 칸만, 방문자에게도 채워진다 */
  analysisHistory: PublicTasteHistoryItem[];
  /** 이번 달 취향분석 남은 횟수 (0~3) — 방문자는 항상 0 */
  tasteAnalysisRemaining: number;
};

export const PublicLibraryHeader = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
  tasteAnalysisRemaining,
}: PublicLibraryHeaderProps) => {
  const router = useRouter();
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  const displayName = profile.nickname || username;

  const isTasteAnalysisUnlocked =
    analyzableBookCount >= TASTE_ANALYSIS_MIN_BOOKS;

  const handleAnalyzeTaste = () => {
    if (!isTasteAnalysisUnlocked) {
      // "필요합니다"(요건)가 아니라 "볼 수 있어요"(가까워진 보상)로 말한다.
      // 5권 게이트 자체는 AI 비용과 묶인 제품 결정이라 그대로 둔다.
      // "별점" 이 아니라 "평가" 라고 말하는 이유: 게이트가 세는 쿼리는
      // .not('rating','is',null) 이라 0점("평가 안 함")도 센다. 0점은 사용자가
      // 평가 컨트롤을 건드려 고른 상태이므로 "평가를 남긴" 은 사실이지만,
      // "별점을 남긴" 은 쿼리가 세지 않는 것을 약속하게 된다.
      toast.info(
        `평가를 남긴 완독 책이 ${TASTE_ANALYSIS_MIN_BOOKS - analyzableBookCount}권 더 모이면 취향 분석을 볼 수 있어요.`
      );
      return;
    }

    if (newBooksSinceLastAnalysis !== null && newBooksSinceLastAnalysis < 5) {
      toast.error(
        `이전 분석 이후 새로 읽은 책이 ${newBooksSinceLastAnalysis}권이에요. 5권 이상 쌓이면 다시 분석할 수 있어요.`
      );
      return;
    }

    if (tasteAnalysisRemaining <= 0) {
      toast.error(USAGE_LIMIT_EXCEEDED_MESSAGE);
      return;
    }

    setIsAnalyzeDialogOpen(true);
  };

  const doAnalyzeTaste = async () => {
    setIsAnalyzing(true);

    try {
      await apiClient.post('/taste-analysis/analyze');
      // 성공한 것만 센다 — 월 한도 초과나 실패는 "실행"이 아니다
      trackEvent('taste_analysis_run');
      toast.success('취향 분석이 완료되었습니다!');
      // 분석 성공으로 남은 횟수가 줄었으므로, 다른 화면으로 이동하기 전에
      // 이 라우트의 캐시를 무효화해둔다 — 나중에 "내 서재로" 등으로
      // 돌아왔을 때 남은 횟수가 갱신 전 값으로 보이는 것을 방지한다.
      router.refresh();
      router.push('/dashboard/taste-analysis');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, '취향 분석 중 오류가 발생했습니다.')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 분석 버튼은 취향 카드 안으로 들어간다 — 카드가 결과와 다음 행동을 같이 보여 준다
  const analyzeButton = isOwnProfile ? (
    <Button
      onClick={handleAnalyzeTaste}
      disabled={isAnalyzing}
      size='sm'
      // 아직 열리지 않은 기능은 한 단계 낮춰 보인다 — 누르면 몇 권 남았는지 안내한다
      variant={isTasteAnalysisUnlocked ? 'default' : 'outline'}
      className={isTasteAnalysisUnlocked ? undefined : 'shadow-none'}
      {...coachTarget('taste-analysis')}
    >
      {isAnalyzing && <Loader2 className='h-4 w-4 animate-spin' />}
      {isAnalyzing
        ? '분석 중… (최대 1분)'
        : isTasteAnalysisUnlocked
          ? `${analysisHistory.length > 0 ? '다시 분석' : '취향 분석'} (${tasteAnalysisRemaining}/${MONTHLY_LIMIT} 남음)`
          : // 5권이 모이기 전에 "3/3 남음"을 보이면 지금 바로 쓸 수 있는 것처럼 읽힌다
            `취향 분석 (${analyzableBookCount}/${TASTE_ANALYSIS_MIN_BOOKS}권)`}
    </Button>
  ) : undefined;

  // 방문자에게 분석 결과가 없으면 카드를 숨기고 프로필이 전체 폭을 쓴다
  const hasTasteCard = isOwnProfile || analysisHistory.length > 0;

  return (
    <>
      {/* 스카이 틴트 면 — 공개 서재의 '전시장 입구'. 왼쪽은 누구인지, 오른쪽은 어떤 독자인지 */}
      <header
        className={`grid gap-6 rounded-[28px] bg-accent p-6 sm:p-8 lg:items-center ${
          hasTasteCard ? 'lg:grid-cols-[1fr_400px]' : ''
        }`}
      >
        <div className='flex min-w-0 items-center gap-5'>
          {profile.photo_url ? (
            <div className='relative size-20 shrink-0 overflow-hidden rounded-full bg-muted'>
              <Image
                src={profile.photo_url}
                alt={`${displayName} 프로필`}
                fill
                sizes='80px'
                className='object-cover'
                priority
                unoptimized={isPreOptimizedImageSrc(profile.photo_url)}
              />
            </div>
          ) : (
            <div className='flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary'>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className='min-w-0'>
            <p className='mb-1 text-sm font-medium text-primary'>공개 서재</p>
            <h1 className='heading-1 truncate'>{displayName}님의 서재</h1>
            <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className='text-sm text-text-subtle'>@{username}</span>
              <FollowStats
                userId={profile.id}
                onFollowersClick={() => setFollowersModalOpen(true)}
                onFollowingClick={() => setFollowingModalOpen(true)}
              />
            </div>
            {profile.bio && (
              <p className='mt-3 max-w-2xl break-keep text-sm leading-relaxed text-text-body'>
                {profile.bio}
              </p>
            )}

            <div className='mt-4 flex flex-wrap items-center gap-2'>
              {!isOwnProfile && <FollowButton userId={profile.id} />}

              {!isOwnProfile ? (
                <Button asChild variant='outline' className='shadow-none'>
                  <Link href={`/${username}/compatibility`}>
                    <Sparkles className='h-4 w-4' />
                    독서 케미
                  </Link>
                </Button>
              ) : (
                <Button asChild variant='outline' className='shadow-none'>
                  <Link href='/settings'>프로필 편집</Link>
                </Button>
              )}

              {/* 모바일에서는 네이티브 공유 시트로, 데스크톱에서는 주소 복사로 떨어진다 */}
              <ShareButton
                path={`/${username}`}
                title={`${displayName}님의 책장`}
                text='책장을 보면, 그 사람이 보입니다.'
              />
            </div>
          </div>
        </div>

        {hasTasteCard && (
          <TasteProfileCard
            history={analysisHistory}
            isOwner={isOwnProfile}
            action={analyzeButton}
            analyzableBookCount={analyzableBookCount}
            minBooks={TASTE_ANALYSIS_MIN_BOOKS}
          />
        )}
      </header>

      {isOwnProfile && (
        <AlertDialog
          open={isAnalyzeDialogOpen}
          onOpenChange={setIsAnalyzeDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>AI 독서 취향 분석</AlertDialogTitle>
              <AlertDialogDescription>
                분석에 최대 1분 정도 소요될 수 있어요. 완료될 때까지 이 화면을
                유지해주세요. 시작하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={doAnalyzeTaste}>
                시작
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isAnalyzing && (
        <div className='fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm'>
          <Loader2 className='h-10 w-10 animate-spin text-primary' />
          <div className='text-center'>
            <p className='text-lg font-medium'>취향을 분석하고 있어요~</p>
            <p className='mt-1 text-sm text-muted-foreground'>
              최대 1분 정도 걸려요. 이 화면을 벗어나지 말고 잠시만 기다려주세요.
            </p>
          </div>
        </div>
      )}

      <FollowListModal
        userId={profile.id}
        type='followers'
        open={followersModalOpen}
        onOpenChange={setFollowersModalOpen}
        currentUserId={currentUserId}
      />
      <FollowListModal
        userId={profile.id}
        type='following'
        open={followingModalOpen}
        onOpenChange={setFollowingModalOpen}
        currentUserId={currentUserId}
      />
    </>
  );
};
