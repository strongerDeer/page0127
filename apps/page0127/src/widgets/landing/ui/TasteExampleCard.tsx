import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

/**
 * 랜딩용 AI 취향 분석 결과 예시 카드
 *
 * 학습 포인트:
 * - 정적 목업 컴포넌트 — 데이터 fetch 없이 실제 결과 UI(TasteAnalysisResult)의
 *   시각 언어(타입 강조 박스·태그 pill·패턴 박스)만 빌려와 가치 제안을 보여준다
 * - 랜딩에서 "말로 설명"하는 대신 "결과물을 미리 보여주는" 마케팅 패턴
 */

// 예시 데이터 — 서비스 톤을 보여주는 카피 자산이므로 컴포넌트와 같은 파일에 유지
const EXAMPLE = {
  personalityType: '마음의 결을 읽는 사람',
  description:
    '당신의 책장에는 사람의 마음을 들여다보는 책이 많아요. 소설 속 인물의 감정을 천천히 따라가고, 에세이에서 위로를 찾는 편이네요. 빠르게 많이 읽기보다, 좋았던 한 권을 오래 곱씹는 분입니다.',
  likedTopics: ['심리', '관계', '성장'],
  likedStyles: ['담담한 문체', '긴 호흡의 이야기'],
} as const;

export const TasteExampleCard = () => {
  return (
    <Card className='relative mx-auto max-w-2xl text-left shadow-none'>
      <span className='absolute right-4 top-4 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground'>
        분석 결과 예시
      </span>
      <CardHeader>
        <CardTitle className='text-xl'>📖 당신의 독서 성향</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='mb-4 rounded-lg bg-chart-2/10 p-4'>
          <p className='text-center text-xl font-bold text-chart-2'>
            {EXAMPLE.personalityType}
          </p>
        </div>
        <p className='leading-relaxed text-foreground'>{EXAMPLE.description}</p>

        <div className='mt-5 space-y-3'>
          <div>
            <p className='text-sm font-medium text-muted-foreground'>
              눈길이 머무는 주제
            </p>
            <div className='mt-1 flex flex-wrap gap-2'>
              {EXAMPLE.likedTopics.map((topic) => (
                <span
                  key={topic}
                  className='rounded-full bg-chart-3/15 px-3 py-1 text-sm text-chart-3'
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className='text-sm font-medium text-muted-foreground'>
              좋아하는 문장의 결
            </p>
            <div className='mt-1 flex flex-wrap gap-2'>
              {EXAMPLE.likedStyles.map((style) => (
                <span
                  key={style}
                  className='rounded-full bg-chart-3/15 px-3 py-1 text-sm text-chart-3'
                >
                  {style}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className='mt-6 border-t border-border pt-4 text-sm text-muted-foreground'>
          완독한 책이 열 권쯤 모이면, 당신의 이야기도 들려드릴 수 있어요.
        </p>
      </CardContent>
    </Card>
  );
};
