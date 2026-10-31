import { Button } from '@repo/ui';
import { Pointer } from 'lucide-react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { NudgeTrigger } from '@/features/reading-nudge/ui/NudgeTrigger';

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
    const list = within(canvas.getByRole('list', { name: '독서 순위' }));
    await expect(list.getAllByRole('listitem')).toHaveLength(5);
    await expect(list.getAllByRole('listitem')[2]).toHaveTextContent('나');
    await userEvent.click(canvas.getByRole('button', { name: '쪽수' }));
    const updatedList = within(canvas.getByRole('list', { name: '독서 순위' }));
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
      within(canvasElement).getByRole('list', { name: '독서 순위' })
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
    const list = within(canvas.getByRole('list', { name: '독서 순위' }));
    await expect(list.getAllByLabelText('1위')).toHaveLength(3);
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
    await userEvent.click(
      canvas.getByRole('button', { name: '독서 배틀 집계 기준' })
    );
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('status')
    ).toHaveTextContent('나: 쪽수 미등록 12권');
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

export const OneActiveReader: Story = {
  name: '여러 명 · 0권도 공동 순위와 작은 시상대',
  args: {
    readers: [me, zero, { ...zero, userId: 'another', nickname: '다른 리더' }],
    actions: (reader) => (
      <NudgeTrigger
        recipientName={reader.nickname ?? '리더'}
        iconOnly
        onClick={() => {}}
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('상위 세 명')).toBeVisible();
    await expect(
      canvas.getAllByRole('button', { name: /님 콕 찌르기/ })
    ).toHaveLength(2);
    await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument();
    await expect(
      within(canvas.getByRole('list', { name: '독서 순위' })).getAllByRole(
        'listitem'
      )
    ).toHaveLength(3);
    await expect(
      within(canvas.getByRole('list', { name: '독서 순위' })).getAllByLabelText(
        '2위'
      )
    ).toHaveLength(2);
    await expect(canvas.queryByText(/선두 기록 대비/)).not.toBeInTheDocument();
  },
};

export const NudgeInsteadOfWaiting: Story = {
  name: '상대 0권 · 대기 문구 대신 콕 찌르기',
  args: {
    readers: [me, zero],
    actions: (_reader, _mine, appearance) => (
      <Button
        variant='outline'
        size={appearance === 'label' ? 'md' : 'icon-sm'}
        aria-label='호님 콕 찌르기'
      >
        <Pointer size={16} aria-hidden='true' />
        {appearance === 'label' && '콕 찌르기'}
      </Button>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: '호님 콕 찌르기' })
    ).toHaveTextContent('콕 찌르기');
    await expect(
      canvas.queryByText('상대의 올해 공개 기록을 기다려요')
    ).not.toBeInTheDocument();
  },
};

export const HelpOnDemand: Story = {
  name: '집계 기준 · 아이콘을 눌러 확인',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      page.queryByText(/서울 기준 2026년 공개 완독/)
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: '독서 배틀 집계 기준' })
    );
    await waitFor(() =>
      expect(page.getByText(/서울 기준 2026년 공개 완독/)).toBeVisible()
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        page.queryByText(/서울 기준 2026년 공개 완독/)
      ).not.toBeInTheDocument()
    );
  },
};

export const Genres: Story = {
  name: '장르 문어발 · 대분류 비교',
  args: {
    readers: [
      { ...me, genres: ['인문학', '과학'] },
      { ...jisu, genres: ['소설/시/희곡'] },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '장르 문어발' }));
    await expect(
      canvas.getByRole('img', { name: /나 2분야, 지수 1분야/ })
    ).toBeVisible();
  },
};
export const GenresTied: Story = {
  args: {
    readers: [
      { ...me, genres: ['인문학'] },
      { ...jisu, genres: ['과학'] },
      { ...minho, genres: [] },
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '장르 문어발' })
    );
  },
};
export const GenresAlone: Story = {
  args: { readers: [{ ...me, genres: [] }] },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '장르 문어발' })
    );
  },
};

export const CompactRankingActions: Story = {
  name: '좁은 랭킹 · 아이콘과 툴팁이 잘리지 않음',
  args: {
    readers: [
      me,
      { ...zero, nickname: '아주긴닉네임을사용하는리더' },
      { ...zero, userId: 'third', nickname: '세 번째 리더' },
    ],
    actions: (reader) => (
      <NudgeTrigger
        recipientName={reader.nickname ?? '리더'}
        iconOnly
        onClick={() => {}}
      />
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const list = canvas.getByRole('list', { name: '독서 순위' });
    for (const button of within(list).getAllByRole('button')) {
      const bounds = button.getBoundingClientRect();
      expect(bounds.width).toBe(32);
      expect(bounds.right).toBeLessThanOrEqual(
        list.getBoundingClientRect().right
      );
      expect(bounds.left).toBeGreaterThanOrEqual(
        list.getBoundingClientRect().left
      );
      await expect(button).toHaveTextContent('');
    }
    await userEvent.hover(within(list).getAllByRole('button')[0]);
    await expect(await page.findByRole('tooltip')).toHaveTextContent(
      '콕 찌르기'
    );
  },
};

/** 팔로잉 100명 중 87위: 상위 5명 + 내 앞뒤만 카드에, 나머지는 전체 순위 모달로. */
const crowd: LeagueReader[] = Array.from({ length: 100 }, (_, i) => ({
  ...me,
  userId: `reader-${i + 1}`,
  username: `reader-${i + 1}`,
  nickname: `리더 ${i + 1}`,
  completedBooks: i < 86 ? 120 - i : 100 - i,
}));

export const HundredFollowing: Story = {
  name: '팔로잉 100명 · 87위',
  args: { readers: [{ ...me, completedBooks: 33 }, ...crowd] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const list = within(canvas.getByRole('list', { name: '독서 순위' }));
    const rows = list.getAllByRole('listitem');
    await expect(rows).toHaveLength(8);
    await expect(rows[6]).toHaveTextContent('나');
    await expect(within(rows[6]).getByLabelText('87위')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: '전체 순위 보기 (101명)' })
    );
    const dialog = await page.findByRole('dialog', { name: '전체 순위' });
    await expect(dialog).toHaveTextContent('나는 87위');
    const all = within(
      within(dialog).getByRole('list', { name: '전체 독서 순위' })
    ).getAllByRole('listitem');
    await expect(all).toHaveLength(101);
    await waitFor(() => {
      const me = all[86].getBoundingClientRect();
      expect(me.top).toBeGreaterThanOrEqual(0);
      expect(me.bottom).toBeLessThanOrEqual(window.innerHeight);
    });
  },
};
