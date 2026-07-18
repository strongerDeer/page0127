'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  BookCopy,
  BookOpen,
  Check,
  Gift,
  Heart,
  Inbox,
  Sprout,
} from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageContainer } from '@/shared/ui/PageContainer';

import { getCompatibilityTypeByScore } from '@/entities/compatibility/model/compatibilityTypes';

import type {
  CompatibilityAnalysis,
  MutualRecommendation,
} from '@/entities/compatibility/types';

type CompatibilityViewProps = {
  targetUserId: string;
  targetName: string;
  username: string;
  /** 캐싱된 분석 결과 (없으면 인트로 화면) */
  analysis: CompatibilityAnalysis | null;
  /** 내가 받은 추천 (상대방 책장에서) */
  recommendationsForMe: MutualRecommendation[];
  /** 상대가 받은 추천 (내 책장에서) */
  recommendationsForTarget: MutualRecommendation[];
  /** 내 완독(별점 포함) 권수 */
  myBooksCount: number;
  /** 상대의 공개 완독(별점 포함) 권수 */
  targetBooksCount: number;
  /** 정렬된 쌍에서 내가 user1인지 (reading_patterns 매핑용) */
  isCurrentUserFirst: boolean;
};

const MIN_BOOKS = 5;

/**
 * 독서 궁합 화면 (Client Component)
 *
 * 학습 포인트:
 * - 결과 유무에 따라 인트로/결과 화면 분기
 * - 분석 실행 후 router.refresh()로 Server Component 데이터를 다시 받아온다
 *   (클라이언트 상태로 결과를 들고 있지 않아도 됨)
 */
export const CompatibilityView = ({
  targetUserId,
  targetName,
  username,
  analysis,
  recommendationsForMe,
  recommendationsForTarget,
  myBooksCount,
  targetBooksCount,
  isCurrentUserFirst,
}: CompatibilityViewProps) => {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canAnalyze =
    myBooksCount >= MIN_BOOKS && targetBooksCount >= MIN_BOOKS;

  const runAnalysis = async (force: boolean) => {
    setIsAnalyzing(true);
    try {
      await apiClient.post('/compatibility/analyze', {
        targetUserId,
        force,
      });
      toast.success('궁합 분석이 완료되었습니다!');
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, '궁합 분석 중 오류가 발생했습니다.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <PageContainer width='content'>
      {/* 헤더 */}
      <div className='mb-8'>
        <Link href={`/${username}`}>
          <Button variant='outline' size='sm' className='mb-4'>
            ← {targetName} 님의 서재로
          </Button>
        </Link>
        <h1 className='heading-1 text-text-strong'>독서 궁합</h1>
        <p className='mt-1 text-sm text-text-subtle'>
          {targetName} 님과 나, 얼마나 닮은 독서가일까요?
        </p>
      </div>

      {analysis ? (
        <CompatibilityResult
          analysis={analysis}
          targetName={targetName}
          recommendationsForMe={recommendationsForMe}
          recommendationsForTarget={recommendationsForTarget}
          isCurrentUserFirst={isCurrentUserFirst}
          isAnalyzing={isAnalyzing}
          onReanalyze={() => setIsDialogOpen(true)}
        />
      ) : (
        <CompatibilityIntro
          targetName={targetName}
          myBooksCount={myBooksCount}
          targetBooksCount={targetBooksCount}
          canAnalyze={canAnalyze}
          isAnalyzing={isAnalyzing}
          onAnalyze={() => setIsDialogOpen(true)}
        />
      )}

      {/* 분석 확인 다이얼로그 */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>독서 궁합 분석</AlertDialogTitle>
            <AlertDialogDescription>
              AI가 두 분의 책장을 나란히 읽고 궁합을 분석해요. 약 30초 정도
              걸려요. 시작할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>다음에요</AlertDialogCancel>
            <AlertDialogAction onClick={() => runAnalysis(!!analysis)}>
              분석 시작
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};

// ─── 인트로 (아직 분석 결과가 없을 때) ───

type CompatibilityIntroProps = {
  targetName: string;
  myBooksCount: number;
  targetBooksCount: number;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
};

const CompatibilityIntro = ({
  targetName,
  myBooksCount,
  targetBooksCount,
  canAnalyze,
  isAnalyzing,
  onAnalyze,
}: CompatibilityIntroProps) => (
  <Card>
    <CardContent className='py-12 text-center'>
      <BookCopy className='mx-auto mb-4 h-9 w-9 text-text-faint' />
      <h2 className='mb-2 heading-2 text-text-strong'>
        두 사람의 책장을 나란히 놓아볼까요?
      </h2>
      <p className='mb-8 text-sm text-text-body'>
        겹치는 관심사와 서로 다른 결을 찾아, 서로의 책장에서 건네줄 책까지 골라
        드려요.
      </p>

      {/* 분석 조건 안내 — ✅ 이모지 대신 lucide Check */}
      <div className='mx-auto mb-8 max-w-sm rounded-lg bg-sunken p-4 text-left text-sm'>
        <p className='mb-2 font-medium text-text-strong'>
          양쪽 모두 완독한 책(별점 포함)이 {MIN_BOOKS}권 이상이면 분석할 수
          있어요.
        </p>
        <BookCountRow
          label='나의 책'
          count={myBooksCount}
          isEnough={myBooksCount >= MIN_BOOKS}
        />
        <BookCountRow
          label={`${targetName} 님의 공개된 책`}
          count={targetBooksCount}
          isEnough={targetBooksCount >= MIN_BOOKS}
        />
      </div>

      <Button size='lg' disabled={!canAnalyze || isAnalyzing} onClick={onAnalyze}>
        {isAnalyzing
          ? '두 분의 책장을 나란히 읽는 중이에요…'
          : '궁합 분석하기'}
      </Button>
      {!canAnalyze && (
        <p className='mt-3 text-sm text-text-subtle'>
          아직 책이 조금 부족해요. 책장이 더 쌓이면 다시 만나요.
        </p>
      )}
    </CardContent>
  </Card>
);

// 분석 조건 한 줄 — 충족 시 체크 아이콘
type BookCountRowProps = {
  label: string;
  count: number;
  isEnough: boolean;
};

const BookCountRow = ({ label, count, isEnough }: BookCountRowProps) => (
  <p className='flex items-center gap-1.5 text-text-subtle'>
    <span>
      {label}: {count}권
    </span>
    {isEnough && (
      <>
        <Check className='h-3.5 w-3.5 text-primary' />
        <span className='sr-only'>조건 충족</span>
      </>
    )}
  </p>
);

// ─── 결과 화면 ───

type CompatibilityResultProps = {
  analysis: CompatibilityAnalysis;
  targetName: string;
  recommendationsForMe: MutualRecommendation[];
  recommendationsForTarget: MutualRecommendation[];
  isCurrentUserFirst: boolean;
  isAnalyzing: boolean;
  onReanalyze: () => void;
};

const CompatibilityResult = ({
  analysis,
  targetName,
  recommendationsForMe,
  recommendationsForTarget,
  isCurrentUserFirst,
  isAnalyzing,
  onReanalyze,
}: CompatibilityResultProps) => {
  const { similarity_analysis: similarity } = analysis;
  const typeBand = getCompatibilityTypeByScore(analysis.compatibility_score);

  // reading_patterns의 user1/user2는 정렬된 쌍 기준 → 내 것/상대 것으로 매핑
  const myPattern = isCurrentUserFirst
    ? similarity.reading_patterns.user1
    : similarity.reading_patterns.user2;
  const targetPattern = isCurrentUserFirst
    ? similarity.reading_patterns.user2
    : similarity.reading_patterns.user1;

  return (
    <div className='space-y-6'>
      {/* 1. 궁합 점수 */}
      <Card>
        <CardContent className='py-10 text-center'>
          <p className='text-6xl font-bold text-primary'>
            {analysis.compatibility_score}
            <span className='text-2xl text-text-faint'>/100</span>
          </p>
          <p className='mt-4 text-2xl font-bold text-text-strong'>
            {analysis.compatibility_type}
          </p>
          <p className='mt-2 text-text-subtle'>{typeBand.tagline}</p>
          <p className='mx-auto mt-6 max-w-xl whitespace-pre-wrap text-left leading-relaxed text-text-body'>
            {analysis.compatibility_description}
          </p>
        </CardContent>
      </Card>

      {/* 2. 두 사람의 독서 패턴 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <BookOpen className='h-4.5 w-4.5 text-text-subtle' />두 사람의 독서
            패턴
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg bg-sunken p-4'>
              <p className='text-sm text-text-subtle'>나</p>
              <p className='mt-1 font-semibold text-text-strong'>{myPattern}</p>
            </div>
            <div className='rounded-lg bg-sunken p-4'>
              <p className='text-sm text-text-subtle'>{targetName} 님</p>
              <p className='mt-1 font-semibold text-text-strong'>
                {targetPattern}
              </p>
            </div>
          </div>

          {similarity.common_interests.length > 0 && (
            <div>
              <p className='mb-2 text-sm text-text-subtle'>
                함께 좋아하는 주제
              </p>
              <div className='flex flex-wrap gap-2'>
                {similarity.common_interests.map((interest) => (
                  <span
                    key={interest}
                    className='rounded-full border border-line px-3 py-1 text-sm text-text-body'
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <h3 className='mb-2 flex items-center gap-1.5 font-semibold text-primary'>
                <Heart className='h-4 w-4' />
                닮은 점
              </h3>
              <ul className='space-y-1 text-sm text-text-body'>
                {similarity.commonalities.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className='mb-2 flex items-center gap-1.5 font-semibold text-text-strong'>
                <Sprout className='h-4 w-4 text-text-subtle' />
                서로를 넓혀줄 부분
              </h3>
              <ul className='space-y-1 text-sm text-text-body'>
                {similarity.differences.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. 상호 추천 도서 */}
      <RecommendationList
        icon={<Inbox className='h-4.5 w-4.5 text-text-subtle' />}
        title={`${targetName} 님의 책장에서 골라온 책`}
        description='상대방이 읽은 책 중, 지금 이어 읽기 좋은 책들이에요.'
        recommendations={recommendationsForMe}
      />
      <RecommendationList
        icon={<Gift className='h-4.5 w-4.5 text-text-subtle' />}
        title={`내 책장에서 ${targetName} 님에게 건네는 책`}
        description='내가 읽은 책 중, 상대방이 좋아할 만한 책들이에요.'
        recommendations={recommendationsForTarget}
      />

      {/* 4. 재분석 */}
      <div className='flex items-center justify-between rounded-xl bg-sunken p-4'>
        <p className='text-sm text-muted-foreground'>
          분석일:{' '}
          {new Date(analysis.created_at).toLocaleDateString('ko-KR')} — 책장이
          더 쌓였다면 다시 분석해보세요.
        </p>
        <Button
          variant='outline'
          size='sm'
          disabled={isAnalyzing}
          onClick={onReanalyze}
        >
          {isAnalyzing ? '분석 중이에요…' : '다시 분석하기'}
        </Button>
      </div>
    </div>
  );
};

// ─── 추천 도서 목록 ───

type RecommendationListProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  recommendations: MutualRecommendation[];
};

const RecommendationList = ({
  icon,
  title,
  description,
  recommendations,
}: RecommendationListProps) => {
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          {icon}
          {title}
        </CardTitle>
        <p className='text-sm text-text-subtle'>{description}</p>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className='flex gap-4 border-t border-line-soft pt-4 first:border-0 first:pt-0'
            >
              {rec.cover_image && (
                // 판형을 크롭하지 않는다 — 높이만 고정하고 너비는 원본 비율대로
                <Image
                  src={rec.cover_image}
                  alt=''
                  width={200}
                  height={290}
                  sizes='88px'
                  className='book-cover h-32 w-auto shrink-0'
                />
              )}
              <div className='flex-1'>
                <h4 className='font-medium text-text-strong'>{rec.title}</h4>
                {rec.author && (
                  <p className='text-sm text-text-subtle'>{rec.author}</p>
                )}
                <p className='mt-2 text-sm leading-relaxed text-text-body'>
                  {rec.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
