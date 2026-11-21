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
