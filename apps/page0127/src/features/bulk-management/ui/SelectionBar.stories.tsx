import { useState } from 'react';

import { Button } from '@repo/ui';
import { Trash2 } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { SelectionBar } from './SelectionBar';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const TOTAL = 14;

// 알림 화면과 같은 구성 — 동작이 삭제 하나뿐인 경우
const NotificationBar = ({ initial }: { initial: number }) => {
  const [count, setCount] = useState(initial);
  return (
    <SelectionBar
      label='알림 선택 관리'
      toggleAllLabel='모두 선택'
      countLabel={`${count}개 선택`}
      selectedCount={count}
      selectableCount={TOTAL}
      onToggleAll={() => setCount(count >= TOTAL ? 0 : TOTAL)}
      hint='지금 목록에 보이는 알림만 골라요. 한 번에 최대 500개까지예요.'
    >
      <Button
        size='sm'
        variant='destructive'
        className='flex-1 sm:flex-none'
        disabled={!count}
      >
        <Trash2 className='size-4' aria-hidden />
        삭제
      </Button>
    </SelectionBar>
  );
};

const meta = {
  title: 'Features/Bulk/선택 바',
  component: NotificationBar,
  args: { initial: 0 },
} satisfies Meta<typeof NotificationBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/** 일부만 고르면 모두 선택 체크박스가 반쯤 체크된다 */
export const Partial: Story = { args: { initial: 3 } };

export const All: Story = {
  args: { initial: TOTAL },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('checkbox', { name: '모두 선택' });
    await expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await expect(canvas.getByText('0개 선택')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '삭제' })).toBeDisabled();
  },
};
