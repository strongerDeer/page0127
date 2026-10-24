import { READING_PERSONALITY_TYPES } from '@/entities/taste-analysis/model/personalityTypes';

import { FirstImpressionCard } from './FirstImpressionCard';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const typeOf = (name: string) =>
  READING_PERSONALITY_TYPES.find((t) => t.name === name)!;

const meta = {
  title: 'Features/ShelfPreview/FirstImpressionCard',
  component: FirstImpressionCard,
  decorators: [
    (Story) => (
      <div className='tint-cool max-w-md p-6'>
        <Story />
      </div>
    ),
  ],
  args: { type: typeOf('이야기에 사는 사람') },
} satisfies Meta<typeof FirstImpressionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: '이야기에 사는 사람' };

/** 카탈로그에서 가장 연한 색 — 띠로만 쓰는 이유 */
export const LightColor: Story = {
  name: '연한 색 (세상을 넓히는 사람)',
  args: { type: typeOf('세상을 넓히는 사람') },
};

/** 가장 긴 이름 — 모바일 폭에서 줄바꿈 확인 */
export const LongName: Story = {
  name: '긴 이름 (쉬지 않고 페이지를 넘기는 사람)',
  args: { type: typeOf('쉬지 않고 페이지를 넘기는 사람') },
};
