'use client';

import { useState } from 'react';

import Image from 'next/image';
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
import { ArrowRight, ChevronRight, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { toastApiError } from '@/shared/api/demoReadOnly';
import {
  type AnalysisProgress,
  postAnalysisStream,
} from '@/shared/api/postAnalysisStream';
import { USAGE_LIMIT_EXCEEDED_MESSAGE } from '@/shared/lib/aiUsageMessages';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { COMPATIBILITY_MIN_BOOKS } from '@/entities/compatibility/model/analysisGate';
import {
  TASTE_ANALYSIS_BOOK_LABEL,
  TASTE_ANALYSIS_MIN_BOOKS,
} from '@/entities/taste-analysis/model/analysisGate';

import { FollowButton, FollowListModal, FollowStats } from '@/features/follow';
import { coachTarget } from '@/features/onboarding';
import { toLockedAnalysisMessage } from '@/features/rating-nudge';
import { ShareButton, ShareSheetButton } from '@/features/share';
import { TasteAnalysisLoading } from '@/features/taste-analysis/ui/TasteAnalysisLoading';

import { LibraryFeatureBanner } from './LibraryFeatureBanner';
import { toTasteBannerDescription } from './model/featureBanner';
import { type ReaderCard, toIdentityLabel } from './model/readerCard';

import type { FollowSnapshot } from '@/entities/follow';
import type { PublicTasteHistoryItem } from '@/entities/taste-analysis/types';
import type { RatingNudge } from '@/features/rating-nudge';

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
  compatibilityBookCount: number;
  currentUserId?: string;
  /** 취향 분석 가능한 책 권수 (평가를 남긴 완독 책) — 소유자 전용, 방문자는 0 */
  analyzableBookCount: number;
  /** 마지막 분석 이후 새로 추가된 분석 가능 책 권수 — 분석 이력이 없으면 null */
  newBooksSinceLastAnalysis: number | null;
  /** 취향 분석 이력 (최신순 최대 10건) — 공개 칸만, 방문자에게도 채워진다 */
  analysisHistory: PublicTasteHistoryItem[];
  /** 이번 달 취향분석 남은 횟수 (0~3) — 방문자는 항상 0 */
  tasteAnalysisRemaining: number;
  /** 별점만 남기면 취향 분석이 열리는 책이 있을 때 — 소유자 전용, 없으면 null */
  ratingNudge: RatingNudge | null;
  /** 독서 명함 — 성향 이름(주인공)과 숫자 한 줄. 공유 카드(OG)와 같은 규칙 */
  readerCard: ReaderCard;
  /** 서버가 함께 읽은 팔로우 숫자·여부 — null 이면 브라우저가 불러온다 */
  followSnapshot: FollowSnapshot | null;
  /** 공개된 완독·읽는 중 책이 하나라도 있는지 — 없으면 이미지 없이 링크만 공유한다 */
  hasShareableBooks: boolean;
};

export const PublicLibraryHeader = ({
  profile,
  username,
  isOwnProfile,
  compatibilityBookCount,
  currentUserId,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
  tasteAnalysisRemaining,
  ratingNudge,
  readerCard,
  followSnapshot,
  hasShareableBooks,
}: PublicLibraryHeaderProps) => {
  const router = useRouter();
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // 서버 스트림이 알려 주는 단계·전체 진행률 — 분석 중 화면의 막대와 문구
  const [analysisProgress, setAnalysisProgress] =
    useState<AnalysisProgress | null>(null);
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
      // 별점만 남기면 되는 완독 책이 있으면 그 길을 먼저 말한다 — "더 모이면"만 들으면 책을 더 읽어야 하는 줄 안다
      toast.info(
        toLockedAnalysisMessage(
          ratingNudge,
          `${TASTE_ANALYSIS_BOOK_LABEL}이 ${TASTE_ANALYSIS_MIN_BOOKS - analyzableBookCount}권 더 모이면 취향 분석을 볼 수 있어요.`
        )
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
      setAnalysisProgress(null);
      await postAnalysisStream(
        '/taste-analysis/analyze',
        undefined,
        setAnalysisProgress
      );
      // 성공한 것만 센다 — 월 한도 초과나 실패는 "실행"이 아니다
      trackEvent('taste_analysis_run');
      toast.success('취향 분석이 완료되었습니다!');
      // 분석 성공으로 남은 횟수가 줄었으므로, 다른 화면으로 이동하기 전에
      // 이 라우트의 캐시를 무효화해둔다 — 나중에 "내 서재로" 등으로
      // 돌아왔을 때 남은 횟수가 갱신 전 값으로 보이는 것을 방지한다.
      router.refresh();
      router.push('/dashboard/taste-analysis');
    } catch (error) {
      toastApiError(error, '취향 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 분석 버튼은 상단 배너(LibraryFeatureBanner) 안 주 버튼 자리 — 버튼 줄에선 약해 보였다(2026-11-24 HJ).
  // 분석 전엔 버튼 글자("취향 분석 3/5권")와 배너 설명 줄이 남은 권수를 알린다.
  const analyzeButton = isOwnProfile ? (
    <Button
      onClick={handleAnalyzeTaste}
      disabled={isAnalyzing}
      // 아직 열리지 않은 기능은 한 단계 낮춰 보인다 — 누르면 몇 권 남았는지 안내한다
      variant={isTasteAnalysisUnlocked ? 'default' : 'outline'}
      className={isTasteAnalysisUnlocked ? undefined : 'shadow-none'}
      {...coachTarget('taste-analysis')}
    >
      {isAnalyzing && <Loader2 className='h-4 w-4 animate-spin' />}
      {isAnalyzing
        ? '분석 중…'
        : isTasteAnalysisUnlocked
          ? // 남은 횟수는 배너 설명 줄("이번 달 n번 남음")로 옮겼다
            analysisHistory.length > 0
            ? '다시 분석'
            : '취향 분석'
          : // 5권이 모이기 전에 "3/3 남음"을 보이면 지금 바로 쓸 수 있는 것처럼 읽힌다
            `취향 분석 (${analyzableBookCount}/${TASTE_ANALYSIS_MIN_BOOKS}권)`}
      {!isAnalyzing && isTasteAnalysisUnlocked && (
        <ArrowRight aria-hidden className='h-4 w-4' />
      )}
    </Button>
  ) : undefined;

  // 주인이 보는 AI 성향 이름은 상세(근거·추천)로 가는 입구다 — 예전 카드의 "자세히 ›" 자리
  const latestAnalysisId = analysisHistory[0]?.id;
  const { identity } = readerCard;

  // 상단 배너 — 주인은 AI 취향 분석, 방문자는 독서 케미(양쪽 책이 모자라면 배너 없음).
  // 아래에 따로 있던 비로그인용 "독서 케미는?" 카드와 버튼 줄의 '독서 케미' 버튼을 이 한 장으로 모았다.
  const featureBanner = isOwnProfile ? (
    <LibraryFeatureBanner
      kind='taste'
      title={
        <>
          내 책장이 말해 주는
          <br />
          나의 독서 성향
        </>
      }
      description={toTasteBannerDescription({
        unlocked: isTasteAnalysisUnlocked,
        booksToUnlock: TASTE_ANALYSIS_MIN_BOOKS - analyzableBookCount,
        lastAnalyzedAt: analysisHistory[0]?.created_at ?? null,
        remaining: tasteAnalysisRemaining,
        bookLabel: TASTE_ANALYSIS_BOOK_LABEL,
      })}
      actions={
        <>
          {latestAnalysisId && (
            <Button asChild variant='outline' className='shadow-none'>
              <IntentPrefetchLink
                href={`/dashboard/taste-analysis/${latestAnalysisId}`}
              >
                결과 보기
              </IntentPrefetchLink>
            </Button>
          )}
          {analyzeButton}
        </>
      }
    />
  ) : compatibilityBookCount >= COMPATIBILITY_MIN_BOOKS ? (
    <LibraryFeatureBanner
      kind='chemistry'
      title={
        <>
          나와 이 서재,
          <br />
          얼마나 닮았을까?
        </>
      }
      description='겹치는 책과 취향을 AI가 찾아 줘요'
      actions={
        <Button asChild>
          {/* 비로그인이면 케미 페이지가 로그인으로 보냈다가 돌아온다 */}
          <IntentPrefetchLink
            href={`/${username}/compatibility`}
            onClick={() =>
              trackEvent('cta_click', {
                location: 'library_chemi',
                label: '독서 케미',
              })
            }
          >
            케미 보기
            <ArrowRight aria-hidden className='h-4 w-4' />
          </IntentPrefetchLink>
        </Button>
      }
    />
  ) : null;

  return (
    <>
      {/* 스카이 틴트 띠 — 공개 서재의 '전시장 입구'. 화면 끝까지 꽉 채운다(둥근 카드로 띄우지 않는다).
          왼쪽은 누구인지, 오른쪽은 어떤 독자인지 */}
      <header className='bg-accent'>
        {/* 넓은 화면: 왼쪽 명함 · 오른쪽 배너. 좁은 화면: 명함 아래 배너 */}
        <div
          className={`page-width grid items-center gap-8 py-8 md:py-10 ${
            featureBanner
              ? 'lg:grid-cols-[minmax(0,1fr)_540px] lg:gap-16 lg:py-14'
              : ''
          }`}
        >
          {/* 사진 위, 정보 아래. 한줄 소개는 사진 옆 말풍선으로 — 주인이 직접 건네는 말처럼 읽힌다 */}
          <div className='flex min-w-0 flex-col items-start gap-4'>
            <div className='flex w-full items-center gap-4'>
              {profile.photo_url ? (
                <div className='relative size-20 shrink-0 overflow-hidden rounded-full bg-muted'>
                  <Image
                    src={profile.photo_url}
                    alt={`${displayName} 프로필`}
                    fill
                    sizes='80px'
                    className='object-cover'
                    // 첫 화면에 보이니 lazy 로 미루지는 않되, preload 는 하지 않는다.
                    // 80px 사진은 LCP 후보가 아니라(제목 글자·표지가 더 크다) priority 의
                    // <link rel=preload> + 높은 우선순위가 폰트·CSS 와 대역폭만 다툰다.
                    loading='eager'
                    unoptimized={isPreOptimizedImageSrc(profile.photo_url)}
                  />
                </div>
              ) : (
                // 띠 배경이 bg-accent 라 같은 색이면 원이 사라진다 → 말풍선·버튼처럼 흰 카드 + 옅은 테두리로 띄운다
                <div className='flex size-20 shrink-0 items-center justify-center rounded-full border border-line-soft bg-card text-2xl font-bold text-accent-foreground'>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {profile.bio && (
                <p className='relative max-w-md break-keep rounded-2xl border border-line-soft bg-card px-4 py-3 text-sm leading-relaxed text-text-body'>
                  {/* 말풍선 꼬리 — 사진 쪽을 가리킨다 */}
                  <span
                    aria-hidden
                    className='absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 bg-card'
                  />
                  <span className='relative'>{profile.bio}</span>
                </p>
              )}
            </div>

            <div className='min-w-0'>
              {/*
              독서 명함 — 주인공은 "어떤 독자인가"(성향), 이름과 숫자는 그 아래 한 줄.
              h1 은 이름 그대로 둔다: 성향은 분석할 때마다 바뀌고, 페이지 제목·검색 노출도 이름이다.
              이름은 자르지 않고 줄을 바꾼다 — truncate 였을 때 모바일에서 'stronger_khj…' 만 남고
              '님의 서재' 까지 잘렸다. 밑줄 섞인 아이디는 단어 경계가 없어 anywhere 로 꺾는다.
            */}
              {identity ? (
                <>
                  {isOwnProfile &&
                  identity.source === 'analysis' &&
                  latestAnalysisId ? (
                    <IntentPrefetchLink
                      href={`/dashboard/taste-analysis/${latestAnalysisId}`}
                      className='mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline'
                    >
                      <span
                        aria-hidden
                        className='size-2 rounded-full'
                        style={{ backgroundColor: identity.color }}
                      />
                      {toIdentityLabel(identity)}
                      <ChevronRight aria-hidden className='size-4' />
                    </IntentPrefetchLink>
                  ) : (
                    <p className='mb-1 flex items-center gap-1.5 text-sm font-medium text-primary'>
                      <span
                        aria-hidden
                        className='size-2 rounded-full'
                        style={{ backgroundColor: identity.color }}
                      />
                      {toIdentityLabel(identity)}
                    </p>
                  )}
                  <p className='heading-1 break-keep text-balance'>
                    {identity.name}
                  </p>
                  <div className='mt-1 flex flex-wrap items-baseline gap-x-2'>
                    <h1 className='text-base font-bold text-text-strong [overflow-wrap:anywhere] md:text-lg'>
                      {displayName}님의 서재
                    </h1>
                    {readerCard.stat && (
                      <p className='text-sm text-text-body'>
                        {readerCard.stat}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className='mb-1 text-sm font-medium text-primary'>
                    공개 서재
                  </p>
                  <h1 className='heading-1 [overflow-wrap:anywhere]'>
                    {displayName}님의 서재
                  </h1>
                  {readerCard.stat && (
                    <p className='mt-1 text-sm text-text-body'>
                      {readerCard.stat}
                    </p>
                  )}
                </>
              )}
              <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-2'>
                <span className='text-sm text-text-body'>@{username}</span>
                {/* 숫자는 누구나, 명단(모달)은 본인만 — 남의 서재에선 숫자만 글자로 보인다.
                    API(403)·DB(follows RLS)도 같은 규칙이다 (2026-11-23) */}
                <FollowStats
                  userId={profile.id}
                  onFollowersClick={
                    isOwnProfile ? () => setFollowersModalOpen(true) : undefined
                  }
                  onFollowingClick={
                    isOwnProfile ? () => setFollowingModalOpen(true) : undefined
                  }
                  initialStats={followSnapshot?.stats}
                />
              </div>

              <div className='mt-4 flex flex-wrap items-center gap-2'>
                {/*
                  로그인 안 한 방문자의 팔로우는 로그인 화면으로 보낸다 — 독서 케미 링크와 같은 동작.
                  예전엔 버튼이 바로 API 를 불러서 잠깐 '언팔로우'로 뒤집혔다가 401 로 되돌아가며
                  실패 토스트가 떴다(2026-11-24 HJ). 인증이 필요한 행동은 실패 후 알리지 말고 먼저 막는다.
                */}
                {!isOwnProfile &&
                  (currentUserId ? (
                    <FollowButton
                      userId={profile.id}
                      initialIsFollowing={followSnapshot?.isFollowing}
                    />
                  ) : (
                    <Button asChild>
                      <IntentPrefetchLink
                        href={`/login?redirect=${encodeURIComponent(`/${username}`)}`}
                      >
                        <UserPlus aria-hidden className='h-4 w-4' />
                        팔로우
                      </IntentPrefetchLink>
                    </Button>
                  ))}

                {isOwnProfile && (
                  <Button asChild variant='outline' className='shadow-none'>
                    <IntentPrefetchLink href='/settings'>
                      프로필 편집
                    </IntentPrefetchLink>
                  </Button>
                )}

                {isOwnProfile && (
                  <Button asChild variant='outline'>
                    <IntentPrefetchLink href='/library/manage'>
                      서재 관리
                    </IntentPrefetchLink>
                  </Button>
                )}

                {/* 공유 버튼 하나 → 시트에서 스토리 이미지 또는 링크 (인스타·카톡 구분은 휴대폰 공유 시트가 한다).
                    주인에게만 — 스토리 이미지는 "내 서재"를 자랑하는 그림이라 남의 서재에서 뜨면 어색하다.
                    책이 하나도 없으면 이미지에 그릴 것이 없다 → 시트 없이 링크만 공유한다 */}
                {isOwnProfile &&
                  (hasShareableBooks ? (
                    <ShareSheetButton
                      path={`/${username}`}
                      imagePath={`/${username}/story-image`}
                      fileName={`page0127-${username}.png`}
                      title={`${displayName}님의 책장`}
                      sheetTitle='서재 공유하기'
                    />
                  ) : (
                    <ShareButton
                      path={`/${username}`}
                      title={`${displayName}님의 책장`}
                    />
                  ))}
              </div>
            </div>
          </div>
          {featureBanner}
        </div>
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
        // 서재 위를 덮고 가운데에 케미와 같은 책장 그림을 띄운다 — 분석 중 다른 버튼을 못 누르게
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm'>
          <div className='w-full max-w-md'>
            <TasteAnalysisLoading progress={analysisProgress?.progress ?? 0} />
          </div>
        </div>
      )}

      {isOwnProfile && (
        <>
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
      )}
    </>
  );
};
