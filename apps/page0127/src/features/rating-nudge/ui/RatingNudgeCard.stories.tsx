import { expect, userEvent, within } from 'storybook/test';

import { RatingNudgeCard } from './RatingNudgeCard';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const books = [
  { id: 'b1', title: '채식주의자', author: '한강' },
  { id: 'b2', title: '모순', author: '양귀자' },
  { id: 'b3', title: '대도시의 사랑법', author: '박상영' },
];

const meta = {
  title: 'Features/RatingNudge/별점 남기기 카드',
  component: RatingNudgeCard,
  args: {
    nudge: { needed: 3, unratedCount: books.length },
    books,
    onSaved: () => {},
  },
} satisfies Meta<typeof RatingNudgeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const 창_열기: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /별점 남기기/ }));
    const dialog = within(document.body).getByRole('dialog');
    await userEvent.click(
      within(dialog).getAllByRole('button', { name: '4점' })[0]
    );
    await expect(
      within(dialog).getByRole('button', { name: '1권 저장' })
    ).toBeEnabled();
  },
};
