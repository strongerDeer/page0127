import { useState } from 'react';

import { expect, fn, userEvent, within } from 'storybook/test';

import { BookRegistrationForm } from '@/features/book/ui/BookRegistrationForm';

import {
  EMPTY_MANUAL_BOOK,
  type ManualBookDraft,
  ManualBookFields,
} from './ManualBookForm';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 검색되지 않는 책 직접 등록 — 도서 등록 폼의 책 정보 자리에 서지 입력칸이 들어간다.
 * 검색창·바코드 없이 책 정보와 독서 기록을 한 화면에서 저장한다.
 */
const ManualRegistration = ({
  onSubmit,
  initialTitle = '',
}: {
  onSubmit: () => void;
  initialTitle?: string;
}) => {
  const [draft, setDraft] = useState<ManualBookDraft>({
    ...EMPTY_MANUAL_BOOK,
    title: initialTitle,
  });
  return (
    <BookRegistrationForm
      book={{
        isbn: '',
        title: '',
        subTitle: null,
        author: '',
        publisher: '',
        pubDate: null,
        description: '',
        category: '',
        coverImage: '',
        spineImage: null,
        backImage: null,
        page: null,
        toc: null,
        dimensions: null,
        source: 'manual',
        providerItemId: null,
        providerLink: '',
      }}
      heading='직접 등록'
      bookSection={<ManualBookFields value={draft} onChange={setDraft} />}
      onSubmit={onSubmit}
      onCancel={fn()}
    />
  );
};

const meta = {
  title: 'Features/Book/직접 등록',
  component: ManualRegistration,
  args: { onSubmit: fn() },
} satisfies Meta<typeof ManualRegistration>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: '빈 화면 — 제목에 바로 손이 간다',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/책 제목/)).toHaveFocus();
    await expect(canvas.getByText(/표지 사진/)).toBeVisible();
    // 제목·저자가 비어 있으면 브라우저 검증이 저장을 막는다
    await userEvent.click(canvas.getByRole('button', { name: '등록하기' }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const FromSearch: Story = {
  name: '검색하다 넘어옴 — 찾던 제목이 채워져 있다',
  args: { initialTitle: '클린 코드' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/책 제목/)).toHaveValue('클린 코드');
    await userEvent.type(canvas.getByLabelText(/저자/), '로버트 C. 마틴');
    await userEvent.click(canvas.getByRole('button', { name: '등록하기' }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};
