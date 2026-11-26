import { useState } from 'react';

import { Button, Toaster } from '@repo/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, within } from 'storybook/test';

import { notifyDemoReadOnly } from '@/shared/api/demoReadOnly';
import { DEMO_READ_ONLY_MESSAGE } from '@/shared/lib/demo/demoAccount';

import { ProfileSettingsForm } from './ProfileSettingsForm';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof ProfileSettingsForm.DangerZone>;

// 계정 삭제 다이얼로그가 useQueryClient 를 써서 감싸 둔다
const Harness = ({ args }: { args: Props }) => {
  const [cache] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={cache}>
      <div className='max-w-xl'>
        <ProfileSettingsForm.DangerZone {...args} />
      </div>
    </QueryClientProvider>
  );
};

const meta = {
  title: 'Features/Profile/설정 · 계정 삭제 구역',
  component: ProfileSettingsForm.DangerZone,
  args: { username: 'hong' },
  // 다이얼로그가 next/navigation 의 useRouter 를 쓴다
  parameters: { nextjs: { appDirectory: true } },
  render: (args) => <Harness args={args} />,
} satisfies Meta<typeof ProfileSettingsForm.DangerZone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 일반: Story = {};

/** 체험 계정 — 공용 계정이라 삭제 버튼을 잠그고, 이유를 한 줄로 적는다 */
export const 체험_계정: Story = {
  args: { isDemo: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '계정 삭제' });
    await expect(button).toBeDisabled();
    // 스크린 리더도 잠긴 이유를 함께 읽는다
    await expect(button).toHaveAccessibleDescription(
      '체험 계정은 삭제할 수 없어요.'
    );
  },
};

/** 체험 계정의 다른 쓰기(보관 전환·공개 범위 등)가 막혔을 때 공통으로 뜨는 안내 */
export const 체험_안내_토스트: Story = {
  render: () => (
    <>
      <Button variant='outline' onClick={notifyDemoReadOnly}>
        저장해 보기
      </Button>
      <Toaster />
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '저장해 보기' }));
    // 여러 번 눌러도 한 장만 — 같은 id 로 띄운다
    await userEvent.click(canvas.getByRole('button', { name: '저장해 보기' }));
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findAllByText(DEMO_READ_ONLY_MESSAGE)).toHaveLength(
      1
    );
  },
};
