import { useState } from 'react';

import { Button, Toaster } from '@repo/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { NudgeButton } from './NudgeButton';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof NudgeButton>;
const Harness = ({ args }: { args: Props }) => {
  const [cache] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  );
  return (
    <QueryClientProvider client={cache}>
      <NudgeButton {...args} />
    </QueryClientProvider>
  );
};
const meta = {
  title: 'Features/ReadingNudge/콕 찌르기 버튼',
  component: NudgeButton,
  args: {
    currentUserId: 'me',
    recipientId: 'jisu',
    recipientName: '지수',
    context: 'ahead',
    iconOnly: true,
    loadSent: fn(async () => [] as string[]),
    loadEligible: fn(async () => ['jisu', 'minho']),
    send: fn<NonNullable<Props['send']>>(async () => 'sent-id'),
  },
  render: (args) => <Harness args={args} />,
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
  beforeEach: () => {
    toast.dismiss();
  },
} satisfies Meta<typeof NudgeButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Compact: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const button = canvas.getByRole('button', { name: '지수님 콕 찌르기' });
    await waitFor(() =>
      expect(button).toHaveAttribute('aria-disabled', 'false')
    );
    await expect(button).toHaveTextContent('');
    await userEvent.hover(button);
    await expect(await page.findByRole('tooltip')).toHaveTextContent(
      '콕 찌르기'
    );
    await userEvent.unhover(button);
    await waitFor(() =>
      expect(page.queryByRole('tooltip')).not.toBeInTheDocument()
    );
    button.focus();
    await expect(await page.findByRole('tooltip')).toHaveTextContent(
      '콕 찌르기'
    );
  },
};
export const Label: Story = { args: { iconOnly: false } };
export const SentAfterReload: Story = {
  args: { loadSent: fn(async () => ['jisu']) },
  render: function Reloadable(args) {
    const [version, setVersion] = useState(0);
    return (
      <div className='flex gap-4'>
        <Harness key={version} args={args} />
        <Button
          variant='outline'
          onClick={() => setVersion((value) => value + 1)}
        >
          새로고침 재현
        </Button>
      </div>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const button = await canvas.findByRole('button', {
      name: '지수님 오늘 콕 찌름',
    });
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    await waitFor(() =>
      expect(
        page.getByText('오늘은 이미 보냈어요. 내일 다시 만나요.')
      ).toBeVisible()
    );
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: '새로고침 재현' })
    );
    await expect(
      await canvas.findByRole('button', { name: '지수님 오늘 콕 찌름' })
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(args.loadSent).toHaveBeenCalledTimes(2);
    await expect(args.send).not.toHaveBeenCalled();
  },
};
export const SendThenBlocked: Story = {
  render: function SendFlow(args) {
    const [cache] = useState(() => new QueryClient());
    const [api] = useState(() => {
      let sent = false;
      return {
        loadSent: async () => (sent ? ['jisu'] : []),
        send: async (
          recipient: string,
          input: Parameters<NonNullable<Props['send']>>[1]
        ) => {
          await args.send!(recipient, input);
          sent = true;
          return 'sent-id';
        },
      };
    });
    return (
      <QueryClientProvider client={cache}>
        <NudgeButton {...args} {...api} />
      </QueryClientProvider>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole('button', { name: '지수님 콕 찌르기' })
    );
    const dialog = await page.findByRole('dialog', {
      name: '지수님 콕 찌르기',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: '한마디' })
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: '한마디 보내기' })
    );
    const button = await canvas.findByRole('button', {
      name: '지수님 오늘 콕 찌름',
    });
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    await waitFor(() =>
      expect(
        page.getByText('오늘은 이미 보냈어요. 내일 다시 만나요.')
      ).toBeVisible()
    );
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(args.send).toHaveBeenCalledOnce();
  },
};
const crossDevice = fn<(userId: string, day: string) => Promise<string[]>>();
export const SentFromAnotherDevice: Story = {
  args: { loadSent: crossDevice },
  beforeEach: () => {
    crossDevice.mockReset();
    crossDevice.mockResolvedValueOnce([]).mockResolvedValue(['jisu']);
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const button = canvas.getByRole('button', { name: '지수님 콕 찌르기' });
    await waitFor(() =>
      expect(button).toHaveAttribute('aria-disabled', 'false')
    );
    await userEvent.click(button);
    await waitFor(() =>
      expect(
        page.getByText('오늘은 이미 보냈어요. 내일 다시 만나요.')
      ).toBeVisible()
    );
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(
      await canvas.findByRole('button', { name: '지수님 오늘 콕 찌름' })
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(args.send).not.toHaveBeenCalled();
  },
};
export const LoadFailed: Story = {
  args: {
    loadSent: fn(async () => {
      throw new Error('offline');
    }),
  },
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '지수님 콕 찌르기' })
    );
    await waitFor(
      () =>
        expect(
          page.getByText(
            '콕 찌르기 기록을 확인하지 못했어요. 다시 눌러 주세요.'
          )
        ).toBeVisible(),
      { timeout: 3000 }
    );
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(args.send).not.toHaveBeenCalled();
  },
};

export const SharedDailyCheck: Story = {
  args: { loadSent: fn(async () => ['jisu']) },
  render: function SharedButtons(args) {
    const [cache] = useState(() => new QueryClient());
    return (
      <QueryClientProvider client={cache}>
        <div className='flex gap-3'>
          <NudgeButton {...args} />
          <NudgeButton {...args} recipientId='minho' recipientName='민호' />
        </div>
      </QueryClientProvider>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole('button', { name: '지수님 오늘 콕 찌름' })
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(
      canvas.getByRole('button', { name: '민호님 콕 찌르기' })
    ).toHaveAttribute('aria-disabled', 'false');
    await expect(args.loadSent).toHaveBeenCalledOnce();
  },
};

export const OneWayFollow: Story = {
  args: { loadEligible: fn(async () => []) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const button = await canvas.findByRole('button', {
      name: '지수님 맞팔 후 콕 찌르기',
    });
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    await waitFor(() =>
      expect(page.getByText('맞팔한 사이에만 보낼 수 있어요.')).toBeVisible()
    );
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(args.send).not.toHaveBeenCalled();
  },
};
export const UnfollowBeforeOpen: Story = {
  render: function RelationshipChanges(args) {
    const [loadEligible] = useState(() => {
      let calls = 0;
      return async () => (++calls === 1 ? ['jisu'] : []);
    });
    return <Harness args={{ ...args, loadEligible }} />;
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const button = await canvas.findByRole('button', {
      name: '지수님 콕 찌르기',
    });
    await waitFor(() =>
      expect(button).toHaveAttribute('aria-disabled', 'false')
    );
    await userEvent.click(button);
    await waitFor(() =>
      expect(page.getByText('맞팔한 사이에만 보낼 수 있어요.')).toBeVisible()
    );
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(args.send).not.toHaveBeenCalled();
  },
};
