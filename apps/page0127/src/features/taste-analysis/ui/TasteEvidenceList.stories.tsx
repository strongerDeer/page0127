import { TasteEvidenceList } from './TasteEvidenceList';

import type { TasteEvidence } from '@/entities/taste-analysis/types';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

// 표지는 비워 둔다 — BookCover 가 제목을 조판한다(스토리는 외부 이미지에 기대지 않는다)
const EVIDENCE: TasteEvidence[] = [
  {
    book_id: 'b1',
    title: '데이터 삽질 끝에 UX가 보였다',
    cover_image: null,
    reason: '일의 현장에서 바로 쓰는 실전 지식을 찾는 시선',
    topics: ['UX 디자인', '개발자 커리어'],
  },
  {
    book_id: 'b2',
    title: '퓨처 셀프',
    cover_image: null,
    reason: '오늘의 습관으로 내일의 나를 설계하려는 마음',
    topics: ['자기계발'],
  },
  {
    book_id: 'b3',
    title: '모순',
    cover_image: null,
    reason: '평범한 일상 아래의 선택을 오래 곱씹는 결',
    topics: [],
  },
];

const meta = {
  title: 'Features/TasteAnalysis/TasteEvidenceList',
  component: TasteEvidenceList,
  decorators: [
    (Story) => (
      <div className='max-w-md bg-card p-5'>
        <Story />
      </div>
    ),
  ],
  args: { evidence: EVIDENCE, variant: 'full' },
} satisfies Meta<typeof TasteEvidenceList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 분석 결과 상세 — 표지·제목·근거 한 줄·주제 */
export const Full: Story = { name: '상세 (full)' };

/** 서재 상단 취향 카드 — 표지만, 누르면 그 책 기록으로 */
export const Compact: Story = {
  name: '카드 (compact)',
  args: { variant: 'compact', bookHref: (id: string) => `/hyejin/${id}` },
};
