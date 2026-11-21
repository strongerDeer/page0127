import daeonsil from '../model/__fixtures__/daeonsil.json';
import { bookGuideSectionsSchema } from '../model/bookGuideSchema';
import { BookGuide } from './BookGuide';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Entities/Book/읽기 가이드',
  component: BookGuide,
  args: {
    // 인스타에 올린 『대온실 수리 보고서』 카드 9장을 옮긴 샘플
    sections: bookGuideSectionsSchema.parse(daeonsil),
  },
  decorators: [
    (Story) => (
      <div className='mx-auto max-w-3xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookGuide>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 대온실_수리_보고서: Story = {};

/**
 * 배경 그림·테두리·명조 — 어드민 "캔버스 전체"·상자 설정으로 만드는 모양.
 * 그림 주소는 실제로는 어드민에서 올린 버킷 주소만 저장된다. 스토리는 public 그림을 빌려 쓴다.
 */
const styled = (() => {
  const sections = bookGuideSectionsSchema.parse(daeonsil);
  const people = structuredClone(sections[0]);
  if (people.type !== 'people') return sections;
  people.canvas = {
    ...people.canvas,
    font: 'serif',
    background: {
      color: 'accent',
      image: '/illustrations/reading-note.webp',
      opacity: 0.15,
    },
  };
  people.leads[0].border = { color: 'text-strong', width: 3 };
  people.groups[0].border = { color: 'primary', width: 2, style: 'dashed' };
  return [people];
})();

export const 배경_테두리_명조: Story = { args: { sections: styled } };
