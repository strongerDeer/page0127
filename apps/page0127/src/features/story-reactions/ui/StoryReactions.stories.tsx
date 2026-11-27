import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';

import { CurrentUserProvider, userKeys } from '@/entities/user';

import { StoryReactions } from './StoryReactions';

import type { Comment } from '@/entities/comment';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { AxiosAdapter } from 'axios';

const NOW = Date.now();
const ago = (hours: number) =>
  new Date(NOW - hours * 3600 * 1000).toISOString();

const comment = (
  id: string,
  nickname: string,
  content: string,
  hours: number
): Comment => ({
  id,
  userId: `u-${id}`,
  parentCommentId: null,
  content,
  createdAt: ago(hours),
  updatedAt: ago(hours),
  user: { id: `u-${id}`, nickname, username: nickname, photoUrl: null },
  replies: [],
});

const COMMENTS = [
  comment('c1', '지은', '저는 한 달에 한 권 정도예요. 생각보다 평균에 가깝네요.', 26),
  comment('c2', '민수', '독서 시간이 이렇게 짧은 줄 몰랐어요.', 4),
];

/** 주소로 갈라 응답한다 — 좋아요는 /likes, 댓글은 /comments */
const adapter: AxiosAdapter = async (config) => ({
  data: config.url?.endsWith('/likes')
    ? { count: 12, isLiked: false }
    : COMMENTS,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const meta = {
  title: 'Features/Story/책 이야기 반응',
  component: StoryReactions,
  args: { storyId: 'story-1' },
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story, ctx) => {
      const loggedIn = ctx.parameters.loggedIn !== false;
      const Provider = ({ children }: { children: React.ReactNode }) => {
        const [client] = useState(() => {
          const c = new QueryClient({
            defaultOptions: { queries: { retry: false, staleTime: Infinity } },
          });
          c.setQueryData(
            userKeys.me(),
            loggedIn ? { id: 'me', email: 'me@example.com' } : null
          );
          return c;
        });
        return (
          <QueryClientProvider client={client}>
            <CurrentUserProvider>{children}</CurrentUserProvider>
          </QueryClientProvider>
        );
      };
      return (
        <Provider>
          <div className='max-w-[720px]'>
            <Story />
          </div>
        </Provider>
      );
    },
  ],
  beforeEach: () => {
    const original = apiClient.defaults.adapter;
    apiClient.defaults.adapter = adapter;
    return () => {
      apiClient.defaults.adapter = original;
    };
  },
} satisfies Meta<typeof StoryReactions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 회원 — 하트 누르기 + 댓글 목록 + 맨 아래 입력칸 */
export const 회원: Story = {};

/** 비회원(검색으로 온 독자) — 하트는 로그인으로, 입력칸 대신 로그인 버튼 */
export const 비회원: Story = {
  parameters: { loggedIn: false },
};
