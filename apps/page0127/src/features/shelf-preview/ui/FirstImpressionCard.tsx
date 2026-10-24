import type { ReadingPersonalityType } from '@/entities/taste-analysis/model/personalityTypes';

type FirstImpressionCardProps = { type: ReadingPersonalityType };

/**
 * 세 권을 고르면 나오는 책장의 첫인상 — 홈 부제("세 권을 골라보세요")의 약속을 갚는 자리.
 *
 * 학습 포인트:
 * - "첫인상"이라 부른다. 가입 뒤 AI 취향 노트가 다른 타입을 골라도 거짓말이 되지 않는다.
 * - 성향 색은 왼쪽 띠에만 쓴다(TasteProfileCard 와 같은 문법). 카탈로그엔 흰 바탕 글자로
 *   쓰면 대비가 모자란 연한 색(#74b0ff)도 있어서, 이름 글자는 본문 색으로 둔다.
 */
export const FirstImpressionCard = ({ type }: FirstImpressionCardProps) => (
  <div className='relative overflow-hidden rounded-xl border border-line-soft bg-card py-4 pr-4 pl-6'>
    <span
      aria-hidden='true'
      className='absolute inset-y-0 left-0 w-1.5'
      style={{ backgroundColor: type.color }}
    />
    <p className='text-xs font-medium text-text-subtle'>내 책장의 첫인상</p>
    <p className='mt-1 break-keep font-bold text-text-strong md:text-lg'>
      첫인상은 {type.name}이에요.
    </p>
    <p className='mt-1 break-keep text-sm text-text-body'>
      앞으로 더 깊은 취향 탐색을 같이 해요!
    </p>
  </div>
);
