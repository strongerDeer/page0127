import { expect, fn, userEvent, within } from 'storybook/test';

import { CompleteReadingForm } from './CompleteReadingForm';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
const meta = {
  title: 'Entities/Book/완독 기록 입력',
  component: CompleteReadingForm,
  args: { onSubmit: fn(), onCancel: fn() },
  decorators: [
    (Story) => (
      <div className='mx-auto max-w-sm p-5'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CompleteReadingForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const UnknownDate: Story = {
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement);
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.click(page.getByRole('button', { name: '완독 기록 저장' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      completedDate: null,
      completedYear: null,
      rating: null,
      isPublic: true,
    });
  },
};
export const YearAndRating: Story = {
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement);
    await userEvent.click(page.getByRole('button', { name: '연도만' }));
    await userEvent.clear(page.getByLabelText('완독 연도'));
    await userEvent.type(page.getByLabelText('완독 연도'), '2023');
    await userEvent.click(page.getByRole('button', { name: '5점' }));
    await userEvent.click(page.getByLabelText('공개 기록으로 남기기'));
    await userEvent.click(page.getByRole('button', { name: '완독 기록 저장' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      completedDate: null,
      completedYear: 2023,
      rating: 5,
      isPublic: false,
    });
  },
};
export const SaveFailed: Story = {
  args: { error: '저장하지 못했어요. 다시 시도해 주세요.' },
};
