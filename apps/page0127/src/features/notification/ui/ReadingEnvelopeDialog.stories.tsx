import { useState } from 'react';

import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { NotificationItem } from './NotificationItem';
import { ReadingEnvelopeDialog } from './ReadingEnvelopeDialog';

import type { NotificationWithActor } from '@/entities/notification';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

// 외부 서점 응답과 무관하게 표지 배치와 로딩을 확인하는 시안용 표지다.
const exampleCover = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="348" viewBox="0 0 240 348"><rect width="240" height="348" fill="#1e3559"/><rect x="15" y="15" width="210" height="318" rx="2" fill="none" stroke="#c6d7eb"/><text x="120" y="76" fill="#f7efdc" text-anchor="middle" font-family="serif" font-size="35">데미안</text><text x="120" y="111" fill="#e4d7b9" text-anchor="middle" font-family="serif" font-size="16">헤르만 헤세</text><circle cx="157" cy="190" r="28" fill="#e4d7b9"/><path d="M16 258 Q70 224 120 254 T224 248V332H16Z" fill="#4b6b85"/><path d="M16 286 Q70 261 120 287 T224 280V332H16Z" fill="#314c6a"/></svg>')}`;

const notification: NotificationWithActor = {
  id: 'envelope',
  user_id: 'reader',
  actor_id: 'sender',
  type: 'reading_nudge',
  target_id: 'book',
  target_type: 'book',
  target: {
    title: '데미안',
    isReply: false,
    cover_image: exampleCover,
    author: '헤르만 헤세',
  },
  message: '같이 한 권 읽자 👀',
  is_read: false,
  created_at: '2026-10-26T01:00:00Z',
  updated_at: '2026-10-26T01:00:00Z',
  actor: { id: 'sender', nickname: '지수', username: 'jisoo', photo_url: null },
};
const retryRead = fn();

const meta = {
  title: 'Features/Notification/책 봉투',
  component: ReadingEnvelopeDialog,
  args: { notification, onClose: fn(), onRead: fn(), onVisit: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ReadingEnvelopeDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Arrived: Story = {};
export const NoCover: Story = {
  args: {
    notification: {
      ...notification,
      target: { ...notification.target!, cover_image: null },
    },
  },
};
export const OpenLetter: Story = {
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole('button', { name: '봉투 열어보기' }));
    await expect(args.onRead).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(page.getByText('데미안', { selector: 'p' })).toBeVisible()
    );
    await userEvent.click(
      await page.findByRole('button', { name: '책 보러 가기' })
    );
    await expect(args.onVisit).toHaveBeenCalledWith(notification);
  },
};
export const JustAMessage: Story = {
  args: {
    notification: {
      ...notification,
      target_id: null,
      target_type: null,
      target: null,
    },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole('button', { name: '봉투 열어보기' }));
    await waitFor(() =>
      expect(
        page.getByRole('button', { name: '보낸 사람 서재 보기' })
      ).toBeVisible()
    );
  },
};
export const UnavailableBook: Story = {
  args: { notification: { ...notification, target: null } },
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole('button', { name: '봉투 열어보기' }));
    await waitFor(() =>
      expect(page.getByText('지금은 첨부한 책을 볼 수 없어요.')).toBeVisible()
    );
    await userEvent.click(
      await page.findByRole('button', { name: '보낸 사람 서재 보기' })
    );
    await expect(args.onVisit).toHaveBeenCalledWith(
      expect.objectContaining({ target_id: null, target_type: null })
    );
  },
};
export const RetryOpening: Story = {
  args: { onRead: retryRead },
  beforeEach: () => {
    retryRead.mockReset();
    retryRead
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
  },
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole('button', { name: '봉투 열어보기' }));
    await waitFor(() => expect(page.getByRole('alert')).toBeVisible());
    await userEvent.click(page.getByRole('button', { name: '봉투 열어보기' }));
    await waitFor(() =>
      expect(page.getByText('데미안', { selector: 'p' })).toBeVisible()
    );
    await expect(args.onRead).toHaveBeenCalledTimes(2);
  },
};
export const LongNames: Story = {
  args: {
    notification: {
      ...notification,
      actor: {
        ...notification.actor,
        nickname: '아주아주긴닉네임을쓰는책장주인',
      },
      target: {
        title: '긴 제목의 책도 잘 읽히도록 줄바꿈하여 보여 주는 편지',
        isReply: false,
      },
    },
  },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
export const NotificationToLetter: Story = {
  render: function EnvelopeFlow(args) {
    const [open, setOpen] = useState(false);
    const [read, setRead] = useState(false);
    return (
      <div className='mx-auto max-w-sm bg-card'>
        <NotificationItem
          notification={{ ...notification, is_read: read }}
          onClick={() => setOpen(true)}
        />
        {open && (
          <ReadingEnvelopeDialog
            {...args}
            onRead={() => {
              setRead(true);
              return args.onRead();
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      page.getByRole('button', { name: /책 봉투가 도착했어요/ })
    );
    await userEvent.click(page.getByRole('button', { name: '봉투 열어보기' }));
    await waitFor(() =>
      expect(page.getByText('데미안', { selector: 'p' })).toBeVisible()
    );
    await userEvent.keyboard('{Escape}');
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(page.getByText('열어본 책 봉투')).toBeVisible();
  },
};
