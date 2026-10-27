import { fn } from 'storybook/test';

import { BulkConfirmDialog } from './BulkConfirmDialog';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/BulkManagement/Confirmation',
  component: BulkConfirmDialog,
  args: {
    open: true,
    title: '선택한 독서 기록 3개를 삭제할까요?',
    description:
      '평점·리뷰·메모와 연결된 댓글·좋아요도 삭제되며 복구할 수 없어요.',
    actionLabel: '삭제',
    destructive: true,
    pending: false,
    error: null,
    onClose: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof BulkConfirmDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Delete: Story = {};
export const Pending: Story = { args: { pending: true } };
export const Retry: Story = {
  args: {
    error: '처리 결과를 확인하지 못했어요. 같은 작업을 다시 시도해주세요.',
  },
};
