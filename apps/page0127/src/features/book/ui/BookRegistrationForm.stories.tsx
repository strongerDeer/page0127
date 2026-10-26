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
    // 완독이면 완독일 기록 방식 Select 도 combobox 라 이름으로 고른다
    await expect(
      within(canvasElement).getByRole('combobox', { name: /독서 상태/ })
    ).toHaveTextContent('완독');
  },
};
export const Completed: Story = {
  name: '완독 등록 — 필수/선택 구분',
  args: { initialStatus: 'completed' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('필수')).toBeInTheDocument();
    // 접힘 없이 선택 항목이 바로 보인다
    await expect(canvas.getByLabelText('나만의 메모')).toBeVisible();
    // 완독일은 [날짜 ▾] 선택과 날짜 입력칸이 한 줄
    await expect(canvas.getByLabelText('완독일 기록 방식')).toHaveTextContent(
      '날짜'
    );
    await expect(canvas.getByLabelText('완독 날짜')).toBeVisible();
    // 별을 고르면 점수마다 한마디가 바뀐다, 인생책은 별이 하트 색으로
    await userEvent.click(canvas.getByRole('button', { name: '4점' }));
    await expect(canvas.getByText('4점 · 좋았어요')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '인생책' }));
    await expect(
      canvas.getByText('인생책 · 오래 곁에 둘 책이에요')
    ).toBeVisible();
  },
};
