import { expect, userEvent, within } from 'storybook/test';

import { ReadingLeague } from './ReadingLeague';
import {
  ReadingLeagueError,
  ReadingLeagueLoading,
} from './ReadingLeagueStatus';

import type { LeagueReader } from '../model/readingLeague';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const me: LeagueReader = {
  userId: 'me',
  username: 'my-library',
  nickname: '나의 책장',
  photoUrl: null,
  completedBooks: 12,
  totalPages: 3480,
  missingPageBooks: 0,
};
const jisu: LeagueReader = {
  ...me,
  userId: 'jisu',
  username: 'jisu',
  nickname: '지수',
  completedBooks: 18,
  totalPages: 5260,
};
const minho: LeagueReader = {
  ...me,
  userId: 'minho',
  username: 'minho',
  nickname: '민호',
  completedBooks: 14,
  totalPages: 2900,
};
const seoyeon: LeagueReader = {
  ...me,
  userId: 'seoyeon',
  username: 'seoyeon',
  nickname: '서연',
  completedBooks: 8,
  totalPages: 2240,
};
const zero: LeagueReader = {
  ...me,
  userId: 'ho',
  username: 'ho',
  nickname: '호',
  completedBooks: 0,
  totalPages: 0,
};

const meta = {
  title: 'Widgets/ReadingLeague/라운지 독서 리그',
  component: ReadingLeague,
  args: { readers: [me, jisu], currentUserId: 'me', year: 2026 },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 410 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReadingLeague>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: '빈 기록 · 팔로우 없음',
  args: { readers: [{ ...me, completedBooks: 0, totalPages: 0 }] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('link', { name: '첫 완독 기록 남기기' })
    ).toHaveAttribute('href', '/books/add');
    await expect(canvas.queryByText('1위')).not.toBeInTheDocument();
  },
};

export const Alone: Story = {
  name: '나 혼자 · 내 기록과 리더 찾기',
  args: {
    readers: [me],
    discovery: (
      <div className='rounded-xl border border-line p-4 text-sm text-text-body'>
        이런 책장은 어때요? · 추천 리더 슬롯
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('link', { name: /함께 읽을 사람 찾기/ })
    ).toHaveAttribute('href', '/search');
  },
};

export const Duel: Story = {
  name: '두 명 · 게이지 배틀',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('img', { name: /나 12권, 지수 18권/ })
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '쪽수' }));
    await expect(
      canvas.getByRole('img', { name: /나 3,480쪽, 지수 5,260쪽/ })
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: '배틀 모션 다시 보기' })
    );
    await expect(
      canvas.getByRole('link', { name: /지수님 서재 보기/ })
    ).toHaveAttribute('href', '/jisu');
  },
};

export const Leading: Story = {
  name: '두 명 · 내가 선두',
  args: { readers: [me, seoyeon] },
};

export const Tied: Story = {
  name: '두 명 · 동점',
  args: { readers: [me, { ...jisu, completedBooks: 12, totalPages: 3480 }] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('동점', { exact: true })
    ).toBeVisible();
  },
};

export const Many: Story = {
  name: '여러 명 · 시상대와 순위 변경',
  args: { readers: [me, jisu, minho, seoyeon, zero] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = within(canvas.getByRole('list', { name: '전체 독서 순위' }));
    await expect(list.getAllByRole('listitem')).toHaveLength(5);
    await expect(list.getAllByRole('listitem')[2]).toHaveTextContent('나');
    await userEvent.click(canvas.getByRole('button', { name: '쪽수' }));
    const updatedList = within(
      canvas.getByRole('list', { name: '전체 독서 순위' })
    );
    await expect(updatedList.getAllByRole('listitem')[1]).toHaveTextContent(
      '나'
    );
    await expect(updatedList.getAllByRole('listitem')[4]).toHaveTextContent(
      '올해 공개 완독 기록 없음'
    );
  },
};

export const SharedFirst: Story = {
  name: '여러 명 · 공동 1위',
  args: { readers: [{ ...me, completedBooks: 18 }, jisu, minho] },
  play: async ({ canvasElement }) => {
    const list = within(
      within(canvasElement).getByRole('list', { name: '전체 독서 순위' })
    );
    await expect(list.getAllByLabelText('1위')).toHaveLength(2);
    await expect(list.getByLabelText('3위')).toBeVisible();
  },
};

export const NoPublicRecords: Story = {
  name: '여러 명 · 모두 올해 0권',
  args: {
    readers: [me, jisu, minho].map((reader) => ({
      ...reader,
      completedBooks: 0,
      totalPages: 0,
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('아직 순위가 없어요.', { exact: false })
    ).toBeVisible();
    await expect(canvas.getAllByLabelText('순위 없음')).toHaveLength(3);
  },
};

export const MissingPages: Story = {
  name: '쪽수 정보 누락',
  args: {
    readers: [
      { ...me, totalPages: 0, missingPageBooks: 12 },
      { ...jisu, totalPages: 0, missingPageBooks: 18 },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '쪽수' }));
    await expect(
      canvas.getByText('쪽수 정보를 등록하면 비교할 수 있어요.')
    ).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '나: 쪽수 미등록 12권'
    );
  },
};

export const LongNames: Story = {
  name: '긴 이름 · 링크 없는 프로필',
  args: {
    readers: [
      me,
      {
        ...jisu,
        username: null,
        nickname: '아주아주긴이름으로매일책을읽는사람',
      },
    ],
  },
};

export const Unavailable: Story = {
  name: '집계 데이터 없음 · 0권으로 오인하지 않기',
  args: { readers: [] },
};

export const Loading: Story = {
  name: '로딩 · 실제 집계 조회 중',
  render: () => <ReadingLeagueLoading />,
};

export const RetryableError: Story = {
  name: '조회 실패 · 다시 시도',
  render: () => <ReadingLeagueError onRetry={() => {}} isRetrying={false} />,
};
