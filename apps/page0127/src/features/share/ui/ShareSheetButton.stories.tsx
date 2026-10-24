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
  // 버튼을 눌러 시트를 연 상태로 둔다 — 시트가 이 컴포넌트의 본체다.
  // toBeVisible 로 보지 않는다: 열리는 순간엔 fade-in 이 opacity 0 에서 시작해 '안 보임'으로 판정된다
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '서재 공유하기' })
    );
  },
} satisfies Meta<typeof ShareSheetButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 이미지를 받아 오면 미리보기가 서고 이미지 버튼이 열린다 */
export const Open: Story = {
  name: '열린 시트',
  play: async (context) => {
    await meta.play(context);
    const dialog = within(await screen.findByRole('dialog'));
    await expect(
      await dialog.findByRole('img', { name: '혜진님의 책장 미리보기' })
    ).toBeInTheDocument();
    // 파일 공유가 안 되는 브라우저(테스트의 데스크톱 크로미움)에서는 저장으로 떨어진다
    await expect(
      dialog.getByRole('button', { name: /이미지 (공유|저장)하기/ })
    ).toBeEnabled();
    await expect(
      dialog.getByRole('button', { name: '링크 공유하기' })
    ).toBeEnabled();
  },
};

/** 이미지를 못 그려도 링크 공유는 남는다 */
export const ImageFailed: Story = {
  name: '이미지 실패',
  args: { imagePath: '/no-such-image.png' },
  play: async (context) => {
    await meta.play(context);
    const dialog = within(await screen.findByRole('dialog'));
    await expect(
      await dialog.findByText(/이미지를 만들지 못했어요/)
    ).toBeInTheDocument();
    await expect(
      dialog.getByRole('button', { name: /이미지 (공유|저장)하기/ })
    ).toBeDisabled();
    await expect(
      dialog.getByRole('button', { name: '링크 공유하기' })
    ).toBeEnabled();
  },
};
