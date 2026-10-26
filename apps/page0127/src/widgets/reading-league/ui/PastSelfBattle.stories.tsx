import { useState } from 'react';

import { Button } from '@repo/ui';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { PastSelfBattle } from './PastSelfBattle';
import { ReadingBattleFlow } from './ReadingBattleFlow';
import { ReadingLeague } from './ReadingLeague';

import type { PastSelfHistory, PastSelfStats } from '@/entities/book';
import type { FollowingLeagueReader } from '@/entities/follow';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const stats = (
  from: string,
  to: string,
  completedBooks: number,
  totalPages: number,
  undatedBooks = 0
): PastSelfStats => ({
  from,
  to,
  completedBooks,
  totalPages,
  undatedBooks,
  missingPageBooks: 0,
});
const history: PastSelfHistory = {
  asOf: '2026-10-26',
  month: {
    current: stats('2026-10-01', '2026-10-26', 3, 960),
    previous: stats('2026-09-01', '2026-09-26', 2, 720),
  },
  year: {
    current: stats('2026-01-01', '2026-10-26', 15, 4300),
    previous: stats('2025-01-01', '2025-10-26', 12, 3500),
  },
};
const me: FollowingLeagueReader = {
  userId: 'me',
  username: 'my-library',
  nickname: '나의 책장',
  photoUrl: null,
  completedBooks: 15,
  totalPages: 4300,
  missingPageBooks: 0,
};
const recommendations = [
  {
    userId: 'jisu',
    username: 'jisu',
    nickname: '지수',
    photoUrl: null,
    featured: false,
    covers: [],
  },
  {
    userId: 'minho',
    username: 'minho',
    nickname: '민호',
    photoUrl: null,
    featured: false,
    covers: [],
  },
];
const meta = {
  title: 'Widgets/ReadingLeague/지난 나와 배틀',
  component: PastSelfBattle,
  args: { reader: me, history, onDiscover: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 410 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PastSelfBattle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Month: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('img', { name: '이번 달의 나 3권, 지난달의 나 2권' })
    ).toBeVisible();
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: '지난 나와 비교할 기간' }),
      'year'
    );
    await expect(
      canvas.getByRole('img', { name: '올해의 나 15권, 작년의 나 12권' })
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '쪽수' }));
    await expect(
      canvas.getByRole('img', { name: '올해의 나 4,300쪽, 작년의 나 3,500쪽' })
    ).toBeVisible();
  },
};
export const YearByDefault: Story = {
  args: {
    history: {
      ...history,
      month: {
        ...history.month,
        previous: {
          ...history.month.previous,
          completedBooks: 0,
          totalPages: 0,
        },
      },
    },
  },
};
export const Behind: Story = {
  args: {
    history: {
      ...history,
      month: {
        ...history.month,
        current: {
          ...history.month.current,
          completedBooks: 1,
          totalPages: 300,
        },
      },
    },
  },
};
export const Tied: Story = {
  args: {
    history: {
      ...history,
      month: {
        ...history.month,
        current: {
          ...history.month.current,
          completedBooks: 2,
          totalPages: 720,
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('지난 나와 동점')
    ).toBeVisible();
  },
};
const emptyHistory: PastSelfHistory = {
  ...history,
  month: {
    current: history.month.current,
    previous: { ...history.month.previous, completedBooks: 0, totalPages: 0 },
  },
  year: {
    current: history.year.current,
    previous: { ...history.year.previous, completedBooks: 0, totalPages: 0 },
  },
};
export const NoHistory: Story = {
  args: { history: emptyHistory },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: '다른 리더와 비교하기' })
    );
    await expect(args.onDiscover).toHaveBeenCalled();
  },
};
export const NoRecords: Story = {
  args: {
    reader: { ...me, completedBooks: 0, totalPages: 0 },
    history: emptyHistory,
  },
};
export const Undated: Story = {
  args: {
    history: {
      ...emptyHistory,
      month: {
        ...emptyHistory.month,
        previous: { ...emptyHistory.month.previous, undatedBooks: 6 },
      },
      year: {
        ...emptyHistory.year,
        previous: { ...emptyHistory.year.previous, undatedBooks: 6 },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/비교할 지난 기록의 완독 날짜가 부족해요/)
    ).toBeVisible();
  },
};
export const MissingPages: Story = {
  args: {
    history: {
      ...history,
      month: {
        ...history.month,
        previous: {
          ...history.month.previous,
          totalPages: 0,
          missingPageBooks: 2,
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '쪽수' }));
    await expect(canvas.getByText('쪽수 정보 일부 없음')).toBeVisible();
    await expect(
      canvas.queryByText('지난 나를 앞서는 중')
    ).not.toBeInTheDocument();
  },
};

const FlowDemo = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const person = recommendations.find((reader) => reader.userId === selected);
  return (
    <ReadingBattleFlow
      key={selected ? 'following' : 'self'}
      hasFollowing={Boolean(person)}
      recommendations={recommendations}
      renderSelf={(onDiscover) => (
        <PastSelfBattle reader={me} history={history} onDiscover={onDiscover} />
      )}
      renderFollow={(reader) => (
        <Button
          type='button'
          className='w-full'
          aria-label={`${reader.nickname}님 팔로우하고 비교하기`}
          onClick={() => setSelected(reader.userId)}
        >
          팔로우하고 비교하기
        </Button>
      )}
      following={
        person ? (
          <ReadingLeague
            currentUserId='me'
            year={2026}
            readers={[
              me,
              {
                ...me,
                ...person,
                completedBooks: person.userId === 'jisu' ? 18 : 14,
                totalPages: 5260,
              },
            ]}
          />
        ) : null
      }
    />
  );
};
export const FollowFlow: Story = {
  render: () => <FlowDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: '다른 리더와 비교하기' })
    );
    await expect(
      canvas.getByRole('heading', { name: '함께 읽을 리더' })
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: '지수님 팔로우하고 비교하기' })
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('img', { name: /나 15권, 지수 18권/ })
      ).toBeVisible()
    );
    await expect(
      canvas.queryByRole('combobox', { name: '지난 나와 비교할 기간' })
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '올해 공개 완독 기록으로 비교'
    );
  },
};
export const InteractiveFlow: Story = {
  name: '팔로우 전환 흐름 · 직접 눌러보기',
  render: () => <FlowDemo />,
};
export const DiscoveryEmpty: Story = {
  render: () => (
    <ReadingBattleFlow
      hasFollowing={false}
      recommendations={[]}
      renderSelf={(onDiscover) => (
        <PastSelfBattle reader={me} history={history} onDiscover={onDiscover} />
      )}
      following={null}
      renderFollow={() => null}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: '지난 나와 비교할 기간' }),
      'year'
    );
    await userEvent.click(
      canvas.getByRole('button', { name: '다른 리더와 비교하기' })
    );
    await expect(
      canvas.getByRole('link', { name: /직접 리더 찾아보기/ })
    ).toHaveAttribute('href', '/search');
    await userEvent.click(
      canvas.getByRole('button', { name: '배틀로 돌아가기' })
    );
    await expect(
      canvas.getByRole('heading', { name: '지금의 라이벌은 지난 나.' })
    ).toBeVisible();
    await expect(
      canvas.getByRole('combobox', { name: '지난 나와 비교할 기간' })
    ).toHaveValue('year');
  },
};
export const FollowingLoadFailed: Story = {
  render: () => (
    <ReadingBattleFlow
      hasFollowing={false}
      recommendations={[]}
      renderSelf={() => null}
      following={null}
      renderFollow={() => null}
      transition='error'
      onRetryFollowing={fn()}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('팔로우는 완료');
    await expect(
      canvas.getByRole('button', { name: '올해 기록 다시 불러오기' })
    ).toBeEnabled();
  },
};
