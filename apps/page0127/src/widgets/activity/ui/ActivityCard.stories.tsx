import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CurrentUserProvider, userKeys } from '@/entities/user';

import { ActivityCard } from './ActivityCard';

import type { Activity } from '@/entities/activity';
import type { Comment } from '@/entities/comment';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const NOW = Date.now();
const ago = (hours: number) =>
  new Date(NOW - hours * 3600 * 1000).toISOString();

const comment = (
  id: string,
  nickname: string,
  content: string,
  hours: number,
  parentCommentId: string | null = null,
  replies: Comment[] = []
): Comment => ({
  id,
  userId: `u-${id}`,
  parentCommentId,
  content,
  createdAt: ago(hours),
  updatedAt: ago(hours),
  user: { id: `u-${id}`, nickname, username: nickname, photoUrl: null },
  replies,
});

const COMMENTS: Comment[] = [
  comment('c1', '지은', '저도 이 책 읽고 싶었어요!', 70),
  comment('c2', '민수', '마지막 장이 오래 남아요.', 30, null, [
    comment('r1', '혜진', '맞아요, 저도 거기서 멈췄어요.', 20, 'c2'),
  ]),
  comment('c3', '수아', '다음 달 독서 모임 책으로 추천할게요.', 3),
];

const activity = (comments: Comment[] | undefined): Activity => ({
  id: 'a1',
  activity_type: 'book_completed',
  content: null,
  created_at: ago(5),
  user: { id: 'u1', nickname: '혜진', username: 'hyejin', photo_url: null },
  book: {
    id: 'b1',
    title: '대온실 수리 보고서',
    author: '김금희',
    cover_image: null,
    status: 'completed',
    rating: 5,
    is_life_book: true,
  },
  likes: { count: 3, isLiked: false },
  commentCount: comments ? 4 : 0,
  newCommentCount: comments ? 1 : 0,
  comments,
  bookEvents: [],
  reviewContent: '끝의 여운이 길게도 남는 책.',
});

const Provider = ({ children }: { children: React.ReactNode }) => {
  const [client] = useState(() => {
    const c = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    c.setQueryData(userKeys.me(), { id: 'me', email: 'me@example.com' });
    return c;
  });
  return (
    <QueryClientProvider client={client}>
      <CurrentUserProvider>{children}</CurrentUserProvider>
    </QueryClientProvider>
  );
};

const meta = {
  title: 'Widgets/Activity/피드 카드',
  component: ActivityCard,
  args: { activity: activity(COMMENTS) },
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <Provider>
        <div className='max-w-[358px]'>
          <Story />
        </div>
      </Provider>
    ),
  ],
} satisfies Meta<typeof ActivityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 댓글은 펼친 채 — 최근 2개 + 입력칸, 위에 "이전 댓글 N개 보기". 새 댓글은 숫자 옆 점 */
export const 댓글_있음: Story = {};

/** 댓글이 없으면 입력칸을 늘어놓지 않는다 — "댓글"을 누르면 열린다 */
export const 댓글_없음: Story = {
  args: { activity: activity([]) },
};
