import Link from 'next/link';

import { BookOpen } from 'lucide-react';

import { Card, CardContent } from '@/shared/ui/card';

import { getPersonalityColor } from '@/entities/taste-analysis/model/personalityTypes';

import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type TasteAnalysisHistoryCardsProps = {
  items: TasteAnalysisSummary[];
};

/**
 * 취향 분석 기록 카드 목록 (내 서재 헤더 아래 노출)
 *
 * 학습 포인트:
 * - Server Component — 데이터는 부모(page.tsx)에서 props로 받기만 함
 * - 클라이언트 컴포넌트(DashboardContent) 안에서 렌더링돼도
 *   상호작용(useState 등)이 없어서 문제 없음
 */
export const TasteAnalysisHistoryCards = ({
  items,
}: TasteAnalysisHistoryCardsProps) => {
  if (items.length === 0) return null;

  return (
    <div className='flex gap-3 overflow-x-auto pb-1'>
      {items.map((item) => {
        return (
          <Link
            key={item.id}
            href={`/dashboard/taste-analysis/${item.id}`}
            className='shrink-0'
          >
            <Card className='w-52 py-4 transition-colors hover:border-line-strong'>
              <CardContent className='flex items-stretch gap-3 px-4'>
                {/* 카드 면은 흰 배경 유지, 색은 왼쪽 얇은 바에만 사용 */}
                <div
                  className='w-1 shrink-0 rounded-full'
                  style={{
                    backgroundColor: getPersonalityColor(item.personality_type),
                  }}
                />
                <div className='min-w-0'>
                  <p className='truncate font-semibold text-text-strong'>
                    {item.personality_type}
                  </p>
                  <p className='mt-1 text-xs text-text-subtle'>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </p>
                  <p className='mt-2 flex items-center gap-1 text-xs text-text-subtle'>
                    <BookOpen className='h-3.5 w-3.5' />책{' '}
                    {item.analyzed_books_count}권 분석
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};
