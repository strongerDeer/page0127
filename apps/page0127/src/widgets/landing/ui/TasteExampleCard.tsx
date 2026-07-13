import { BookOpen } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

/**
 * 랜딩용 취향 분석 결과 예시 카드
 *
 * 학습 포인트:
 * - 정적 목업 컴포넌트 — 데이터 fetch 없이 실제 결과 UI(TasteAnalysisResult)의
 *   시각 언어(타입 강조 박스·태그 pill)만 빌려와 가치 제안을 보여준다
 * - 랜딩에서 "말로 설명"하는 대신 "결과물을 미리 보여주는" 패턴
 *
 * 카피 원칙 (00_docs/07 §5):
 * - "당신"을 쓰지 않는다. 밀리의서재도 UI 문구에는 2인칭이 0회다.
 * - 이모지 헤딩(📖)을 쓰지 않는다 → lucide 단색 아이콘
 */

// 예시 데이터 — 서비스 톤을 보여주는 카피 자산이므로 컴포넌트와 같은 파일에 유지
const EXAMPLE = {
  personalityType: '마음의 결을 읽는 사람',
  description:
    '책장에 사람의 마음을 들여다보는 책이 많습니다. 소설 속 인물의 감정을 천천히 따라가고, 에세이에서 위로를 찾는 편이네요. 빠르게 많이 읽기보다, 좋았던 한 권을 오래 곱씹는 분입니다.',
  likedTopics: ['심리', '관계', '성장'],
  likedStyles: ['담담한 문체', '긴 호흡의 이야기'],
} as const;

export const TasteExampleCard = () => {
  return (
    <Card className='relative max-w-2xl text-left'>
      <span className='absolute right-5 top-5 rounded-full border border-line px-2.5 py-1 text-xs text-text-faint'>
        분석 결과 예시
      </span>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <BookOpen className='h-4.5 w-4.5 text-text-subtle' />
          독서 성향
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='mb-4 rounded-lg bg-accent px-4 py-3'>
          <p className='text-center text-lg font-bold text-accent-foreground'>
            {EXAMPLE.personalityType}
          </p>
        </div>
        <p className='leading-relaxed text-text-body'>{EXAMPLE.description}</p>

        <div className='mt-5 space-y-3'>
          <div>
            <p className='text-sm text-text-subtle'>눈길이 머무는 주제</p>
            <div className='mt-1.5 flex flex-wrap gap-2'>
              {EXAMPLE.likedTopics.map((topic) => (
                <span
                  key={topic}
                  className='rounded-full border border-line px-3 py-1 text-sm text-text-body'
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className='text-sm text-text-subtle'>좋아하는 문장의 결</p>
            <div className='mt-1.5 flex flex-wrap gap-2'>
              {EXAMPLE.likedStyles.map((style) => (
                <span
                  key={style}
                  className='rounded-full border border-line px-3 py-1 text-sm text-text-body'
                >
                  {style}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className='mt-6 border-t border-line pt-4 text-sm text-text-subtle'>
          완독한 책이 열 권쯤 모이면, 이런 이야기를 들려드릴 수 있어요.
        </p>
      </CardContent>
    </Card>
  );
};
