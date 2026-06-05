import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageContainer } from '@/shared/ui/PageContainer';

import type { TasteAnalysisWithRecommendations } from '@/entities/taste-analysis/types';

type TasteAnalysisResultProps = {
  analysis: TasteAnalysisWithRecommendations;
};

/**
 * AI 독서 취향 분석 결과 컴포넌트
 *
 * 학습 포인트:
 * - AI 분석 결과 시각화
 * - 추천 도서를 타입별로 구분하여 표시
 */
export const TasteAnalysisResult = ({ analysis }: TasteAnalysisResultProps) => {
  const {
    personality_type,
    personality_description,
    preference_profile,
    recommendations,
  } = analysis;

  return (
    <PageContainer width='content'>
      {/* 헤더 */}
      <div className='mb-8'>
        <Link href='/dashboard'>
          <Button variant='outline' size='sm' className='mb-4'>
            ← 대시보드로 돌아가기
          </Button>
        </Link>
        <h1 className='text-3xl font-bold'>🤖 AI 독서 취향 분석 결과</h1>
        <p className='text-muted-foreground'>
          분석일: {new Date(analysis.created_at).toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* 1. 독서 성향 */}
      <Card className='mb-6 shadow-none'>
        <CardHeader>
          <CardTitle className='text-xl'>📖 당신의 독서 성향</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-4 rounded-lg bg-chart-2/10 p-4'>
            <p className='text-center text-xl font-bold text-chart-2'>
              {personality_type}
            </p>
          </div>
          <p className='whitespace-pre-wrap text-foreground leading-relaxed'>
            {personality_description}
          </p>
          <div className='mt-4 text-sm text-muted-foreground'>
            분석한 책: {analysis.analyzed_books_count}권
          </div>
        </CardContent>
      </Card>

      {/* 2. 선호도 프로필 */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='text-xl'>⭐ 당신의 선호도 프로필</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* 좋아하는 것 */}
          <div>
            <h3 className='mb-3 font-semibold text-chart-3'>💚 좋아하는 것</h3>
            <div className='space-y-2'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  주제
                </p>
                <div className='flex flex-wrap gap-2 mt-1'>
                  {preference_profile.liked.topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className='rounded-full bg-chart-3/15 px-3 py-1 text-sm text-chart-3'
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  스타일
                </p>
                <div className='flex flex-wrap gap-2 mt-1'>
                  {preference_profile.liked.styles.map((style, idx) => (
                    <span
                      key={idx}
                      className='rounded-full bg-chart-3/15 px-3 py-1 text-sm text-chart-3'
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  구조
                </p>
                <div className='flex flex-wrap gap-2 mt-1'>
                  {preference_profile.liked.structures.map((structure, idx) => (
                    <span
                      key={idx}
                      className='rounded-full bg-chart-3/15 px-3 py-1 text-sm text-chart-3'
                    >
                      {structure}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 피하는 것 */}
          <div>
            <h3 className='mb-3 font-semibold text-destructive'>
              💔 피하는 것
            </h3>
            <div className='space-y-2'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  주제
                </p>
                <div className='flex flex-wrap gap-2 mt-1'>
                  {preference_profile.disliked.topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className='rounded-full bg-destructive/15 px-3 py-1 text-sm text-destructive'
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  스타일
                </p>
                <div className='flex flex-wrap gap-2 mt-1'>
                  {preference_profile.disliked.styles.map((style, idx) => (
                    <span
                      key={idx}
                      className='rounded-full bg-destructive/15 px-3 py-1 text-sm text-destructive'
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 기타 패턴 */}
          <div className='rounded-lg bg-muted/50 p-4'>
            <h3 className='mb-2 font-semibold'>📊 독서 패턴</h3>
            <div className='space-y-1 text-sm text-foreground'>
              <p>
                • 선호 페이지 수:{' '}
                {preference_profile.patterns.page_count_preference}
              </p>
              <p>• 선호 저자 유형: {preference_profile.patterns.author_type}</p>
              <p>
                • 선호 출판 시기:{' '}
                {preference_profile.patterns.publication_period}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. 맞춤 추천 도서 */}
      <div className='space-y-6'>
        {/* A. 성향 맞춤 */}
        <RecommendationSection
          title='💯 성향 맞춤 추천'
          description='기존 취향에 딱 맞는 안전한 추천'
          books={recommendations.match}
          color='blue'
        />

        {/* B. 성향 확장 */}
        <RecommendationSection
          title='🌱 성향 확장 추천'
          description='비슷하지만 조금 다른 영역으로 확장'
          books={recommendations.expand}
          color='indigo'
        />

        {/* C. 챌린지 */}
        <RecommendationSection
          title='🚀 챌린지 추천'
          description='안 읽었지만 좋아할 가능성 있는 새로운 영역'
          books={recommendations.challenge}
          color='purple'
        />
      </div>
    </PageContainer>
  );
};

// 추천 도서 섹션 컴포넌트
type RecommendationSectionProps = {
  title: string;
  description: string;
  books: Array<{
    id?: string;
    title: string;
    author: string | null;
    cover_image: string | null;
    isbn: string | null;
    reason: string;
  }>;
  color: 'blue' | 'indigo' | 'purple';
};

const RecommendationSection = ({
  title,
  description,
  books,
  color,
}: RecommendationSectionProps) => {
  // 추천 카테고리별 시각 강조 — 우리 팔레트로 매핑(맞춤=primary, 확장=chart-3, 챌린지=chart-5)
  const colorClasses = {
    blue: 'border-primary/20 bg-primary/5',
    indigo: 'border-chart-3/20 bg-chart-3/5',
    purple: 'border-chart-5/20 bg-chart-5/5',
  };

  return (
    <Card className={`shadow-none ${colorClasses[color]}`}>
      <CardHeader>
        <CardTitle className='text-lg'>{title}</CardTitle>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {books && books.length > 0 ? (
            books.map((book) => (
              <div
                key={book.id}
                className='rounded-lg border border-border bg-card p-4'
              >
                <div className='flex gap-4'>
                  {book.cover_image && (
                    <div className='relative h-32 w-24 shrink-0 overflow-hidden rounded'>
                      <Image
                        src={book.cover_image}
                        alt={book.title}
                        fill
                        sizes='96px'
                        className='object-cover'
                      />
                    </div>
                  )}
                  <div className='flex-1'>
                    <h4 className='font-semibold text-foreground'>
                      {book.title}
                    </h4>
                    {book.author && (
                      <p className='text-sm text-muted-foreground'>
                        {book.author}
                      </p>
                    )}
                    <p className='mt-2 text-sm text-foreground'>
                      {book.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className='text-center text-muted-foreground py-4'>
              추천 도서가 없습니다.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
