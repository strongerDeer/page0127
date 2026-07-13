import Image from 'next/image';
import Link from 'next/link';

import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Heart,
  Rocket,
  Sprout,
  Star,
  Target,
} from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageContainer } from '@/shared/ui/PageContainer';

import type { TasteAnalysisWithRecommendations } from '@/entities/taste-analysis/types';

type TasteAnalysisResultProps = {
  analysis: TasteAnalysisWithRecommendations;
};

/**
 * 독서 취향 분석 결과 컴포넌트
 *
 * 카피·아이콘 원칙 (00_docs/07 §5):
 * - 이모지 헤딩(🤖📖⭐💚💔📊💯🌱🚀)을 쓰지 않는다 → lucide 단색 아이콘
 * - "당신"을 쓰지 않는다 (AI 프롬프트의 문체 지침에서도 금지했다)
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
            <ArrowLeft className='h-4 w-4' />
            내 서재로
          </Button>
        </Link>
        <h1 className='heading-1 text-text-strong'>독서 취향 분석</h1>
        <p className='mt-1 text-sm text-text-subtle'>
          {new Date(analysis.created_at).toLocaleDateString('ko-KR')} 분석 ·
          완독한 책 {analysis.analyzed_books_count}권을 읽었습니다
        </p>
      </div>

      {/* 1. 독서 성향 */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <BookOpen className='h-4.5 w-4.5 text-text-subtle' />
            독서 성향
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-4 rounded-lg bg-accent px-4 py-3'>
            <p className='text-center text-lg font-bold text-accent-foreground'>
              {personality_type}
            </p>
          </div>
          <p className='whitespace-pre-wrap leading-relaxed text-text-body'>
            {personality_description}
          </p>
        </CardContent>
      </Card>

      {/* 2. 선호도 프로필 */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Star className='h-4.5 w-4.5 text-text-subtle' />
            선호도 프로필
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* 좋아하는 것 */}
          <div>
            <h3 className='mb-3 flex items-center gap-1.5 font-semibold text-primary'>
              <Heart className='h-4 w-4' />
              좋아하는 것
            </h3>
            <div className='space-y-3'>
              <TagRow label='주제' tags={preference_profile.liked.topics} />
              <TagRow label='스타일' tags={preference_profile.liked.styles} />
              <TagRow label='구조' tags={preference_profile.liked.structures} />
            </div>
          </div>

          {/* 덜 끌리는 것 — "피하는 것"은 단정적이라 표현을 눅였다 */}
          <div>
            <h3 className='mb-3 font-semibold text-text-subtle'>덜 끌리는 것</h3>
            <div className='space-y-3'>
              <TagRow
                label='주제'
                tags={preference_profile.disliked.topics}
                muted
              />
              <TagRow
                label='스타일'
                tags={preference_profile.disliked.styles}
                muted
              />
            </div>
          </div>

          {/* 기타 패턴 */}
          <div className='rounded-lg bg-sunken p-4'>
            <h3 className='mb-2 flex items-center gap-1.5 font-semibold text-text-strong'>
              <BarChart3 className='h-4 w-4 text-text-subtle' />
              독서 패턴
            </h3>
            <div className='space-y-1 text-sm text-text-body'>
              <p>
                선호 페이지 수: {preference_profile.patterns.page_count_preference}
              </p>
              <p>선호 저자 유형: {preference_profile.patterns.author_type}</p>
              <p>
                선호 출판 시기: {preference_profile.patterns.publication_period}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. 맞춤 추천 도서 */}
      <div className='space-y-6'>
        <RecommendationSection
          icon={<Target className='h-4.5 w-4.5 text-text-subtle' />}
          title='성향 맞춤 추천'
          description='기존 취향에 딱 맞는 안전한 추천'
          books={recommendations.match}
        />
        <RecommendationSection
          icon={<Sprout className='h-4.5 w-4.5 text-text-subtle' />}
          title='성향 확장 추천'
          description='비슷하지만 조금 다른 영역으로 확장'
          books={recommendations.expand}
        />
        <RecommendationSection
          icon={<Rocket className='h-4.5 w-4.5 text-text-subtle' />}
          title='챌린지 추천'
          description='안 읽었지만 좋아할 가능성 있는 새로운 영역'
          books={recommendations.challenge}
        />
      </div>
    </PageContainer>
  );
};

// 태그 한 줄 — 라벨 + pill 목록
type TagRowProps = {
  label: string;
  tags: string[];
  muted?: boolean;
};

const TagRow = ({ label, tags, muted }: TagRowProps) => {
  if (!tags || tags.length === 0) return null;

  return (
    <div>
      <p className='text-sm text-text-subtle'>{label}</p>
      <div className='mt-1.5 flex flex-wrap gap-2'>
        {tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full border border-line px-3 py-1 text-sm ${
              muted ? 'text-text-faint' : 'text-text-body'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

// 추천 도서 섹션 컴포넌트
type RecommendationSectionProps = {
  icon: React.ReactNode;
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
};

const RecommendationSection = ({
  icon,
  title,
  description,
  books,
}: RecommendationSectionProps) => {
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
          {books && books.length > 0 ? (
            books.map((book) => (
              <div
                key={book.id}
                className='flex gap-4 border-t border-line-soft pt-4 first:border-0 first:pt-0'
              >
                {book.cover_image && (
                  // 판형을 크롭하지 않는다 — 높이만 고정하고 너비는 원본 비율대로
                  <Image
                    src={book.cover_image}
                    alt=''
                    width={200}
                    height={290}
                    sizes='88px'
                    className='book-cover h-32 w-auto shrink-0'
                  />
                )}
                <div className='flex-1'>
                  <h4 className='font-medium text-text-strong'>{book.title}</h4>
                  {book.author && (
                    <p className='text-sm text-text-subtle'>{book.author}</p>
                  )}
                  <p className='mt-2 text-sm leading-relaxed text-text-body'>
                    {book.reason}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className='py-4 text-center text-text-subtle'>
              추천 도서가 없습니다.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
