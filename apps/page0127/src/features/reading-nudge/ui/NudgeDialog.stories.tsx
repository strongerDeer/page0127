import { expect, fn, userEvent, within } from 'storybook/test';

import { NudgeDialog } from './NudgeDialog';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/ReadingNudge/콕 찌르기',
  component: NudgeDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    recipientName: '지수',
    books: [{ id: 'book', title: '데미안' }],
    context: 'ahead',
    onSend: fn(),
  },
} satisfies Meta<typeof NudgeDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Together: Story = {
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.selectOptions(page.getByRole('combobox'), 'book');
    await userEvent.click(
      page.getByRole('button', { name: '콕 찌르기 보내기' })
    );
    await expect(args.onSend).toHaveBeenCalledWith('together', 'book');
  },
};
export const Behind: Story = { args: { context: 'behind', books: [] } };
export const Tied: Story = { args: { context: 'tied' } };
export const Sent: Story = {
  args: { sent: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('button', {
        name: '콕 찌르기 보내기',
      })
    ).toBeDisabled();
  },
};
export const Loading: Story = { args: { loading: true } };
export const Failed: Story = {
  args: { loadFailed: true, error: '기록을 불러오지 못했어요.', onRetry: fn() },
};
