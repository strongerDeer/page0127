import { useRouter } from '@storybook/nextjs-vite/navigation.mock';
import { expect, fn, screen, userEvent, within } from 'storybook/test';

import { CompletedYearDialog } from './CompletedYearDialog';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/ShelfPreview/CompletedYearDialog',
  component: CompletedYearDialog,
  // 이 화면은 router.refresh만 쓴다. Next 내부 라우터 경계 없이 명시적으로 모킹한다.
  parameters: { nextjs: { appDirectory: false } },
  beforeEach: () => {
    useRouter.mockReturnValue({
      bfcacheId: 'year-validation-story',
      push: fn(),
      replace: fn(),
      refresh: fn(),
      back: fn(),
      forward: fn(),
      prefetch: fn(),
    });
  },
  args: {
    books: [
      {
        id: 'year-validation-demo',
        title: '연도와 별점 테스트',
        isLifeBook: false,
      },
    ],
    onClose: fn(),
  },
} satisfies Meta<typeof CompletedYearDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValidateCustomYear: Story = {
  play: async ({ args }) => {
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('radio', { name: '연도 입력' }));
    const input = dialog.getByRole('spinbutton', {
      name: '연도와 별점 테스트 완독 연도',
    });
    await userEvent.type(input, '1800');
    await userEvent.click(dialog.getByRole('button', { name: '4점' }));
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('alert')).toHaveTextContent('1900년부터');
    await expect(
      dialog.getByRole('button', { name: '1권 저장' })
    ).toBeDisabled();
    await expect(args.onClose).not.toHaveBeenCalled();

    await userEvent.clear(input);
    await userEvent.type(input, '2015');
    await expect(input).toHaveAttribute('aria-invalid', 'false');
    await expect(dialog.queryByRole('alert')).not.toBeInTheDocument();
    await expect(
      dialog.getByRole('button', { name: '1권 저장' })
    ).toBeEnabled();

    await userEvent.clear(input);
    await expect(
      dialog.getByRole('button', { name: '1권 저장' })
    ).toBeDisabled();
    await userEvent.click(dialog.getByRole('radio', { name: '모름' }));
    await expect(
      dialog.getByRole('button', { name: '1권 저장' })
    ).toBeEnabled();
    await expect(dialog.getByRole('button', { name: '4점' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  },
};

export const UnknownWithoutRating: Story = {
  play: async ({ args }) => {
    const dialog = within(await screen.findByRole('dialog'));
    const save = dialog.getByRole('button', { name: '저장' });
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
