import { NotificationItem } from './NotificationItem';

import type {
  NotificationType,
  NotificationWithActor,
} from '@/entities/notification/model/types';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const notification = (
  type: NotificationType,
  is_read = false
): NotificationWithActor => ({
  id: type,
  user_id: 'reader',
  actor_id: 'sender',
  type,
  target_id: 'book',
  target_type: 'book',
  is_read,
  message: null,
  created_at: '2026-10-27T01:00:00Z',
  updated_at: '2026-10-27T01:00:00Z',
  actor: {
    id: 'sender',
    nickname: '책읽는사람',
    username: 'reader',
    photo_url: null,
  },
  target: { title: '사고외주', isReply: false },
});
const meta = {
  title: 'Features/Notifications',
  component: NotificationItem,
  parameters: { layout: 'padded' },
  args: {
    notification: notification('follow'),
    onClick: () => {},
    onDelete: () => {},
    onMarkAsRead: () => {},
  },
} satisfies Meta<typeof NotificationItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllTypes: Story = {
  render: (args) => (
    <div className='overflow-hidden rounded-2xl border border-line-soft bg-card'>
      {(
        [
          'follow',
          'comment',
          'like',
          'reading_nudge',
          'reading_reminder',
          'weekly_recap',
        ] as const
      ).map((type, index) => (
        <NotificationItem
          {...args}
          key={type}
          notification={notification(type, index % 2 === 1)}
        />
      ))}
    </div>
  ),
};
export const LongNameAndReply: Story = {
  args: {
    notification: {
      ...notification('comment'),
      actor: {
        ...notification('comment').actor,
        nickname: '아주긴프로필이름도작은화면에서잘읽혀야합니다',
      },
      target: {
        title: '긴 제목의 책에 남겨진 댓글에 대한 답글',
        isReply: true,
      },
    },
  },
};
