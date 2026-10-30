import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, within } from 'storybook/test';

import { apiClient } from '@/shared/api/client';

import { LibraryManagement } from './LibraryManagement';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { AxiosAdapter } from 'axios';

const record = (
  id: string,
  title: string,
  author: string,
  isPublic: boolean,
  status: 'completed' | 'reading' | 'want_to_read' = 'completed'
) => ({
  id,
  title,
  author,
  status,
  is_public: isPublic,
  read_count: 1,
  created_at: '2026-10-22T03:00:00Z',
  completed_date: status === 'completed' ? '2026-10-27' : null,
  completed_year: null,
});

// 공개·비공개가 섞여 있어야 배지 차이가 보인다
const RECORDS = [
  record('1', '사고외주', '홍진기', true),
  record('2', '당신의 말이 곧 당신의 수준이다', '루트비히 비트겐슈타인', false),
  record('3', '모든 것이 되는 법', '에밀리 와프닉', true),
  record('4', '어른의 행복은 조용하다', '태수', false, 'reading'),
];

const mockAdapter: AxiosAdapter = async (config) => ({
  data: { records: RECORDS, total: RECORDS.length },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const Provider = ({ children }: { children: React.ReactNode }) => {
  const [cache] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  );
  return <QueryClientProvider client={cache}>{children}</QueryClientProvider>;
};

const meta = {
  title: 'Features/Bulk/서재 관리',
  component: LibraryManagement,
  args: { userId: 'me' },
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <Provider>
        <Story />
      </Provider>
    ),
  ],
  beforeEach: () => {
    const original = apiClient.defaults.adapter;
    apiClient.defaults.adapter = mockAdapter;
    return () => {
      apiClient.defaults.adapter = original;
    };
  },
} satisfies Meta<typeof LibraryManagement>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 두 개를 고른 상태 — 버튼이 켜진다 */
export const Selected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('checkbox', { name: '사고외주 1회독 선택' })
    );
    await userEvent.click(
      canvas.getByRole('checkbox', { name: '모든 것이 되는 법 1회독 선택' })
    );
    await expect(canvas.getByText('2개 기록 선택')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: '비공개로 변경' })
    ).toBeEnabled();
  },
};
