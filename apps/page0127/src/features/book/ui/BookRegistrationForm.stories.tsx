import { expect, fn, userEvent, within } from 'storybook/test';

import { BookRegistrationForm } from './BookRegistrationForm';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/Book/읽는 중 등록',
  component: BookRegistrationForm,
  args: {
    book: {
      isbn: '9780000000001',
      title: '다음 한 권',
      subTitle: null,
      author: '어떤 작가',
      publisher: '출판사',
      pubDate: null,
      description: '',
      category: '소설',
      coverImage: '',
      spineImage: null,
      backImage: null,
      page: 320,
      toc: null,
      dimensions: null,
      source: 'manual',
      providerItemId: null,
      providerLink: '',
    },
    onSubmit: fn(),
    onCancel: fn(),
    initialStatus: 'reading',
  },
} satisfies Meta<typeof BookRegistrationForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Reading: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox')).toHaveTextContent('읽는 중');
    await userEvent.click(canvas.getByRole('button', { name: '등록하기' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'reading' })
    );
    await expect(args.onSubmit).not.toHaveBeenCalledWith(
      expect.objectContaining({ completed_date: expect.any(String) })
    );
  },
};
export const EditingWins: Story = {
  name: '기존 기록 수정은 기존 상태 유지',
  args: { initialData: { status: 'completed' } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('combobox')).toHaveTextContent(
      '완독'
    );
  },
};
