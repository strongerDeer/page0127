import { expect, fn, userEvent, within } from 'storybook/test';

import { READING_PERSONALITY_TYPES } from '@/entities/taste-analysis/model/personalityTypes';

import { ShelfBar } from './ShelfBar';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/ShelfPreview/ShelfBar',
  component: ShelfBar,
  args: {
    count: 1,
    impression: null,
    visible: true,
    onJump: fn(),
    onSave: fn(),
  },
} satisfies Meta<typeof ShelfBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 세 권 전 — 첫인상까지 남은 권수 */
export const BeforeImpression: Story = {
  name: '첫인상 전 (1권)',
  play: async ({ canvasElement, args }) => {
    const bar = within(canvasElement);
    await expect(bar.getByText('2권만 더 고르면 첫인상')).toBeInTheDocument();
    await userEvent.click(bar.getByRole('button', { name: /고른 책 저장/ }));
    await expect(args.onSave).toHaveBeenCalled();
  },
};

/** 세 권부터 — 첫인상 이름이 주인공 */
export const WithImpression: Story = {
  name: '첫인상 (3권)',
  args: {
    count: 3,
    impression: READING_PERSONALITY_TYPES.find(
      (t) => t.name === '쉬지 않고 페이지를 넘기는 사람'
    )!,
  },
  play: async ({ canvasElement, args }) => {
    const bar = within(canvasElement);
    await userEvent.click(
      bar.getByRole('button', { name: /내 책장으로 가기/ })
    );
    await expect(args.onJump).toHaveBeenCalled();
  },
};
