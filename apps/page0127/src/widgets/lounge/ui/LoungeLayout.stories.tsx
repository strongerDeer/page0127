import { Button } from '@repo/ui';
import { Pointer } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { TasteClashCard } from '@/features/taste-clash';

import { ReadingLeague } from '@/widgets/reading-league/ui/ReadingLeague';

import { LoungeLayout } from './LoungeLayout';
import { ReadingPrompt } from './ReadingPrompt';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
const me = {
  userId: 'me',
  username: 'me',
  nickname: '나',
  photoUrl: null,
  completedBooks: 12,
  totalPages: 3400,
  missingPageBooks: 0,
  genres: ['소설/시/희곡', '인문학'],
};
const meta = {
  title: 'Widgets/Lounge/피드와 배틀',
  component: LoungeLayout,
  args: {
    feed: (
      <div className='space-y-5'>
        <h2 className='text-lg font-semibold'>새로운 기록</h2>
        <ReadingPrompt />
        <article className='rounded-xl border border-line bg-card p-6'>
          지수님이 새로운 완독 기록을 남겼어요.
        </article>
      </div>
    ),
    battle: (
      <div className='space-y-4'>
        <ReadingLeague
          currentUserId='me'
          year={2026}
          readers={[
            me,
            {
              ...me,
              userId: 'jisu',
              username: 'jisu',
              nickname: '지수',
              completedBooks: 15,
              genres: ['과학'],
            },
          ]}
          actions={() => (
            <Button
              variant='outline'
              size='icon-sm'
              className='rounded-full'
              aria-label='지수님 콕 찌르기'
            >
              <Pointer size={16} aria-hidden='true' />
            </Button>
          )}
        />
        <TasteClashCard clash={null} />
      </div>
    ),
  },
} satisfies Meta<typeof LoungeLayout>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TwoColumns: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    if (window.innerWidth < 1024) {
      await expect(
        canvas.getByRole('tabpanel', { name: '피드' })
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('tab', { name: '배틀' }));
      await expect(
        canvas.getByRole('tabpanel', { name: '배틀' })
      ).toBeVisible();
      await expect(
        canvas.queryByRole('tabpanel', { name: '피드' })
      ).not.toBeInTheDocument();
    } else {
      await expect(
        canvas.getByRole('tabpanel', { name: '피드' })
      ).toBeVisible();
      await expect(
        canvas.getByRole('tabpanel', { name: '배틀' })
      ).toBeVisible();
    }
  },
};
