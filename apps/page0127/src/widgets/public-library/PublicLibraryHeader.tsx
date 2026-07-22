'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Link2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';

import { getPersonalityColor } from '@/entities/taste-analysis/model/personalityTypes';

import { FollowButton, FollowListModal, FollowStats } from '@/features/follow';
import { TasteAnalysisHistoryCards } from '@/features/taste-analysis/ui/TasteAnalysisHistoryCards';

import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

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
  /** 최신 취향 분석의 성향 타입 이름 — 분석 이력이 없으면 null */
  personalityType: string | null;
  /** 취향 분석 가능한 책 권수 (별점 있는 완독 책) — 소유자 전용, 방문자는 0 */
  analyzableBookCount: number;
  /** 마지막 분석 이후 새로 추가된 분석 가능 책 권수 — 분석 이력이 없으면 null */
  newBooksSinceLastAnalysis: number | null;
  /** 취향 분석 이력 (최신순 최대 10건) — 소유자 전용, 방문자는 빈 배열 */
  analysisHistory: TasteAnalysisSummary[];
  /** 이번 달 취향분석 남은 횟수 (0~3) — 방문자는 항상 0 */
  tasteAnalysisRemaining: number;
};

export const PublicLibraryHeader = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  personalityType,
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

  const handleAnalyzeTaste = () => {
    if (analyzableBookCount < 5) {
      toast.error(
        '취향 분석을 위해 최소 5권의 완독한 책(별점 포함)이 필요합니다.'
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
      toast.error(
        '이번 달 무료 분석 횟수(3회)를 모두 사용했어요. 다음 달 1일에 초기화돼요.'
      );
      return;
    }

    setIsAnalyzeDialogOpen(true);
  };

  const doAnalyzeTaste = async () => {
    setIsAnalyzing(true);

    try {
      await apiClient.post('/taste-analysis/analyze');
      toast.success('취향 분석이 완료되었습니다!');
      router.push('/dashboard/taste-analysis');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, '취향 분석 중 오류가 발생했습니다.')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${username}`
      );
      toast.success('서재 주소를 복사했어요.');
    } catch {
      toast.error('서재 주소를 복사하지 못했어요.');
    }
  };

  return (
    <>
      {/* 스카이 틴트 면 — 공개 서재의 '전시장 입구'. sunken 배경 위에서 얼굴이 된다 */}
      <header className='flex flex-col gap-6 rounded-[28px] bg-accent p-6 sm:p-8 md:flex-row md:items-center md:justify-between'>
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
              />
            </div>
          ) : (
            <div className='flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary'>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className='min-w-0'>
            <p className='mb-1 text-sm font-medium text-primary'>공개 서재</p>
            <h1 className='heading-1 truncate text-text-strong'>
              {displayName}님의 서재
            </h1>
            <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className='text-sm text-text-subtle'>@{username}</span>
              <FollowStats
                userId={profile.id}
                onFollowersClick={() => setFollowersModalOpen(true)}
                onFollowingClick={() => setFollowingModalOpen(true)}
              />
              {personalityType && (
                <span className='inline-flex items-center gap-1.5 rounded-full border border-line-soft bg-card px-3 py-1 text-xs font-medium text-text-body'>
                  <span
                    className='size-2 rounded-full'
                    style={{
                      backgroundColor: getPersonalityColor(personalityType),
                    }}
                  />
                  {personalityType}
                </span>
              )}
            </div>
            {profile.bio && (
              <p className='mt-3 max-w-2xl break-keep text-sm leading-relaxed text-text-body'>
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        <div className='flex shrink-0 flex-wrap items-center gap-2 md:justify-end'>
          {!isOwnProfile && <FollowButton userId={profile.id} />}

          {!isOwnProfile ? (
            <Button asChild variant='outline' className='shadow-none'>
              <Link href={`/${username}/compatibility`}>
                <Sparkles className='h-4 w-4' />
                독서 궁합
              </Link>
            </Button>
          ) : (
            <>
              <Button onClick={handleAnalyzeTaste} disabled={isAnalyzing}>
                {isAnalyzing && <Loader2 className='h-4 w-4 animate-spin' />}
                {isAnalyzing
                  ? '분석 중… (최대 1분)'
                  : `취향 분석 (${tasteAnalysisRemaining}/3 남음)`}
              </Button>
              <Button asChild variant='outline' className='shadow-none'>
                <Link href='/settings'>프로필 편집</Link>
              </Button>
            </>
          )}

          <Button
            variant='outline'
            size='icon'
            className='shadow-none'
            onClick={handleCopyUrl}
            title='공개 서재 주소 복사'
          >
            <span className='sr-only'>공개 서재 주소 복사</span>
            <Link2 className='h-4 w-4' />
          </Button>
        </div>
      </header>

      {isOwnProfile && <TasteAnalysisHistoryCards items={analysisHistory} />}

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
              최대 1분 정도 걸려요. 이 화면을 벗어나지 말고 잠시만
              기다려주세요.
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
