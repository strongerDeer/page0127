import { expect, fn, userEvent, within } from 'storybook/test';

import { NudgeDialog } from './NudgeDialog';

import type { ProviderBook } from '@/shared/api/book-provider';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
const book: ProviderBook = {
  isbn: '9788937460449',
  title: '데미안',
  subTitle: null,
  author: '헤르만 헤세',
  publisher: '민음사',
  pubDate: null,
  description: '',
  category: '소설',
  coverImage: '',
  spineImage: null,
  backImage: null,
  page: 240,
  toc: null,
  dimensions: null,
  source: 'yes24',
  providerItemId: '123',
  providerLink: 'https://www.yes24.com/Product/Goods/123',
};
const meta = {
  title: 'Features/ReadingNudge/메시지 작성',
  component: NudgeDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    recipientName: '지수',
    onSend: fn(),
    onSearch: fn(async () => ({ items: [book], totalResults: 1, page: 1 })),
  },
} satisfies Meta<typeof NudgeDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Recommendation: Story = {
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.clear(page.getByLabelText('전할 한마디'));
    await userEvent.type(page.getByLabelText('전할 한마디'), '네 생각이 났어.');
    await userEvent.type(
      page.getByLabelText('책 제목이나 저자 검색'),
      '데미안'
    );
    await userEvent.click(page.getByRole('button', { name: '책 검색' }));
    await userEvent.click(
      await page.findByRole('button', { name: /데미안 헤르만 헤세/ })
    );
    await userEvent.click(page.getByRole('button', { name: '책 추천 보내기' }));
    await expect(args.onSend).toHaveBeenCalledWith({
      kind: 'recommendation',
      message: '네 생각이 났어.',
      bookIsbn: book.isbn,
    });
  },
};
export const DraftsPersist: Story = {
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.clear(page.getByLabelText('전할 한마디'));
    await userEvent.type(page.getByLabelText('전할 한마디'), '추천 초안');
    await userEvent.click(page.getByRole('button', { name: '한마디' }));
    await userEvent.clear(page.getByLabelText('전할 한마디'));
    await userEvent.type(page.getByLabelText('전할 한마디'), '요즘 어때?');
    await userEvent.click(page.getByRole('button', { name: '책 추천' }));
    await expect(page.getByLabelText('전할 한마디')).toHaveValue('추천 초안');
    await userEvent.click(page.getByRole('button', { name: '한마디' }));
    await userEvent.click(page.getByRole('button', { name: '한마디 보내기' }));
    await expect(args.onSend).toHaveBeenCalledWith({
      kind: 'note',
      message: '요즘 어때?',
      bookIsbn: null,
    });
  },
};
export const Invitation: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole('button', {
        name: '같이 읽기',
      })
    );
  },
};
export const Sent: Story = {
  args: { sent: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('button', {
        name: '책 추천 보내기',
      })
    ).toBeDisabled();
  },
};
export const Failed: Story = {
  args: { loadFailed: true, error: '기록을 불러오지 못했어요.', onRetry: fn() },
};
export const SearchEmpty: Story = {
  args: { onSearch: fn(async () => ({ items: [], totalResults: 0, page: 1 })) },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.type(
      page.getByLabelText('책 제목이나 저자 검색'),
      '없는 책'
    );
    await userEvent.click(page.getByRole('button', { name: '책 검색' }));
    await expect(await page.findByRole('status')).toHaveTextContent(
      '검색 결과가 없어요.'
    );
  },
};
