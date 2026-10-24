import { expect, screen, userEvent, within } from 'storybook/test';

import { ShareSheetButton } from './ShareSheetButton';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/Share/ShareSheetButton',
  component: ShareSheetButton,
  args: {
    path: '/hyejin',
    // 실제로는 /{username}/story-image (서버가 그린 1080×1920). 스토리에선 정적 세로 이미지로 대신한다
    imagePath: '/images/no-book.jpg',
    fileName: 'page0127-hyejin.png',
    title: '혜진님의 책장',
    sheetTitle: '서재 공유하기',
    text: '책장을 보면, 그 사람이 보입니다.',
  },
  // 버튼을 눌러 시트를 연 상태로 둔다 — 시트가 이 컴포넌트의 본체다
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '서재 공유하기' })
    );
    await expect(await screen.findByRole('dialog')).toBeVisible();
  },
} satisfies Meta<typeof ShareSheetButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { name: '열린 시트' };

/** 이미지를 못 그려도 링크 공유는 남는다 */
export const ImageFailed: Story = {
  name: '이미지 실패',
  args: { imagePath: '/no-such-image.png' },
};
