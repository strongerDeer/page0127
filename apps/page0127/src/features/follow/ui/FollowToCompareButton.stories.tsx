import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { apiClient } from '@/shared/api/client';

import { FollowToCompareButton } from './FollowToCompareButton';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const request = fn();
const Provider = ({ children }: { children: React.ReactNode }) => {
  const [cache] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
  );
  return (
    <QueryClientProvider client={cache}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};
const meta = {
  title: 'Features/Follow/팔로우하고 비교하기',
  component: FollowToCompareButton,
  args: { userId: 'jisu', name: '지수', onFollowed: fn(async () => {}) },
  decorators: [
    (Story) => (
      <Provider>
        <Story />
      </Provider>
    ),
  ],
  beforeEach: () => {
    const previous = apiClient.defaults.adapter;
    request.mockClear();
    // 실제 팔로우를 만들지 않고 요청 모양과 성공 후 집계 전환 콜백을 검증한다.
    apiClient.defaults.adapter = async (config) => {
      request(config.method, config.url, config.data);
      return {
        data: {
          id: 'follow',
          follower_id: 'me',
          following_id: 'jisu',
          created_at: '2026-10-26T00:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    return () => {
      apiClient.defaults.adapter = previous;
    };
  },
} satisfies Meta<typeof FollowToCompareButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Follow: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', {
        name: '지수님 팔로우하고 비교하기',
      })
    );
    await waitFor(() => expect(args.onFollowed).toHaveBeenCalledTimes(1));
    await expect(request).toHaveBeenCalledWith(
      'post',
      '/follows',
      JSON.stringify({ following_id: 'jisu' })
    );
  },
};

export const Failed: Story = {
  args: { onFollowed: fn(async () => {}) },
  beforeEach: () => {
    const previous = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async () => {
      throw new Error('팔로우하지 못했어요. 다시 시도해 주세요.');
    };
    return () => {
      apiClient.defaults.adapter = previous;
    };
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: '지수님 팔로우하고 비교하기' })
    );
    await within(canvasElement.ownerDocument.body).findByText(
      '팔로우하지 못했어요. 다시 시도해 주세요.'
    );
    await expect(args.onFollowed).not.toHaveBeenCalled();
    await expect(
      canvas.getByRole('button', { name: '지수님 팔로우하고 비교하기' })
    ).toBeEnabled();
  },
};
