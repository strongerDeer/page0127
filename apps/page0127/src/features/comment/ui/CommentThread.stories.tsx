import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, within } from 'storybook/test';

import { CurrentUserProvider, userKeys } from '@/entities/user';

import { CommentThread } from './CommentThread';

import type { Comment } from '@/entities/comment';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

// 스토리를 연 시각 기준 — 한 번만 재서 createdAt·updatedAt 이 어긋나("수정됨") 보이지 않게
const NOW = Date.now();
const ago = (hours: number) =>
  new Date(NOW - hours * 3600 * 1000).toISOString();

const comment = (
  id: string,
  nickname: string | null,
  content: string,
  hours: number,
  replies: Comment[] = []
): Comment => ({
  id,
  userId: nickname ? `u-${id}` : null,
  parentCommentId: null,
  content,
  createdAt: ago(hours),
  updatedAt: ago(hours),
  user: nickname
    ? { id: `u-${id}`, nickname, username: nickname, photoUrl: null }
    : null,
  replies,
});

const reply = (id: string, parent: string, nickname: string, content: string, hours: number) => ({
  ...comment(id, nickname, content, hours),
  parentCommentId: parent,
});

const THREAD: Comment[] = [
  comment('c1', '지은', '온실 문을 여는 장면에서 한참 멈췄어요.', 50, [
    reply('r1', 'c1', '혜진', '저도요. 그 문장 필사해 뒀어요.', 30),
  ]),
  comment('c2', null, '창경궁 가 보고 싶어졌어요.', 20),
  comment('c3', '민수', '끝까지 읽길 잘했다는 생각이 드는 책.', 2),
];

/** 로그인 여부를 캐시에 미리 심는다 — /api/auth/me 를 부르지 않게 */
const withUser = (loggedIn: boolean) =>
  function Provider({ children }: { children: React.ReactNode }) {
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

const meta = {
  title: 'Features/Comment/댓글 스레드',
  component: CommentThread,
  args: {
    target: { type: 'book', id: 'b1' },
    initialComments: THREAD,
  },
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story, ctx) => {
      const Provider = withUser(ctx.parameters.loggedIn !== false);
      return (
        <Provider>
          <div className='max-w-[358px]'>
            <Story />
          </div>
        </Provider>
      );
    },
  ],
} satisfies Meta<typeof CommentThread>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 목록(오래된 순) → 맨 아래 한 줄 입력. 답글은 세로선으로 묶인다 */
export const 펼친_목록: Story = {};

/** 피드 — 최근 2개만, 위에 "이전 댓글 N개 보기" */
export const 피드_최근_2개: Story = {
  args: { visibleCount: 2 },
};

/** 답글 달기를 누르면 같은 입력칸 위에 "OO님에게 답글" */
export const 답글_쓰는_중: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('button', { name: '답글 달기' })[0]);
    await expect(
      canvas.getByRole('textbox', { name: '지은님에게 답글' })
    ).toHaveFocus();
  },
};

/** 비회원 — 입력칸 대신 로그인 버튼 */
export const 비회원: Story = {
  parameters: { loggedIn: false },
};

/** 댓글이 없을 때 — 큰 빈 화면 없이 입력칸 안내 문구만 */
export const 빈_스레드: Story = {
  args: { initialComments: [] },
};

/** 비회원 + 빈 스레드 — 한 줄 안내 + 로그인 버튼 */
export const 비회원_빈_스레드: Story = {
  args: { initialComments: [] },
  parameters: { loggedIn: false },
};
