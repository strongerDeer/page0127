import { expect, userEvent, waitFor, within } from 'storybook/test';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { computeBadges, SHELF_LEVELS, WIDE_VIEW_LEVELS } from '../model/badges';
import { BadgeCollection } from './BadgeCollection';
import { BadgeMedal } from './BadgeMedal';
import { BadgeSummary } from './BadgeSummary';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const books = Array.from({ length: 12 }, (_, index) =>
  createTestBook({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    isbn: `badge-story-${index}`,
    title:
      index === 0 ? '내가 오래 간직하고 싶은 책' : `기록 속의 책 ${index + 1}`,
    author: index < 3 ? '같은 작가' : `작가 ${index}`,
    category: ['소설', '인문학', '과학'][index % 3],
    completed_date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    start_date: index === 0 ? '2026-01-01' : null,
    page_count: index === 0 ? 650 : 200,
    is_life_book: index === 0,
    read_count: index === 0 ? 2 : 1,
  })
);

const meta = {
  title: 'Features/Badge/배지 책장',
  component: BadgeCollection,
  args: {
    isOwner: true,
    username: 'stronger_khj',
    books,
    readingGoal: { year: 2026, target: 20 },
    firstTasteAnalysisAt: '2026-10-24T00:00:00Z',
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof BadgeCollection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Owner: Story = {};
export const Visitor: Story = { args: { isOwner: false } };
export const EmptyOwner: Story = {
  args: { books: [], readingGoal: null, firstTasteAnalysisAt: null },
};
export const LibrarySummary: Story = {
  render: (args) => <BadgeSummary {...args} username='stronger_khj' />,
  play: async ({ canvasElement }) => {
    const shelf = within(canvasElement).getByRole('list', {
      name: '획득한 배지 책장',
    });
    const visible = within(shelf).getAllByRole('button');
    await expect(visible[0]).toHaveAccessibleName('취향 발견 (획득)');
    await expect(shelf.scrollWidth).toBeLessThanOrEqual(shelf.clientWidth);
    const bounds = shelf.getBoundingClientRect();
    for (const button of visible) {
      const rect = button.getBoundingClientRect();
      await expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
      await expect(rect.right).toBeLessThanOrEqual(bounds.right + 0.5);
    }
  },
};

export const Covers: Story = {
  render: () => {
    const badges = computeBadges({
      books: [],
      readingGoal: null,
      firstTasteAnalysisAt: null,
    });
    const variants = badges.flatMap((badge) => {
      const levels =
        badge.id === 'shelf'
          ? SHELF_LEVELS
          : badge.id === 'wide-view'
            ? WIDE_VIEW_LEVELS
            : [null];
      return levels.map((_, i) => ({ ...badge, earned: true, level: i + 1 }));
    });
    return (
      <div className='grid grid-cols-3 gap-x-6 gap-y-8 sm:grid-cols-5'>
        {variants.map((badge) => (
          <div
            key={`${badge.id}-${badge.level}`}
            className='flex flex-col items-center gap-3'
          >
            <BadgeMedal badge={badge} size={140} />
            <span className='text-xs text-text-strong'>{badge.name}</span>
          </div>
        ))}
      </div>
    );
  },
};

export const OpenAndCloseBook: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: '인생책 발견 (획득)' })
    );
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = within(screen.getByRole('dialog'));
    await waitFor(() =>
      expect(dialog.getByRole('heading', { name: '인생책 발견' })).toBeVisible()
    );
    await expect(
      dialog.queryByRole('link', { name: '내가 오래 간직하고 싶은 책' })
    ).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: '책 펼쳐보기' }));
    await expect(
      dialog.getByRole('button', { name: '책장에 꽂기' })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      dialog.getByRole('link', { name: '내가 오래 간직하고 싶은 책' })
    ).toHaveAttribute(
      'href',
      '/stronger_khj/00000000-0000-4000-8000-000000000000'
    );
    await userEvent.click(dialog.getByRole('button', { name: '책장에 꽂기' }));
    await expect(
      dialog.getByRole('button', { name: '책 펼쳐보기' })
    ).toHaveAttribute('aria-pressed', 'false');
    await userEvent.keyboard('{Escape}');
    await expect(
      canvas.queryByRole('button', { name: '책등으로 보기' })
    ).not.toBeInTheDocument();
  },
};

export const SecretBook: Story = {
  args: { books: [], readingGoal: null, firstTasteAnalysisAt: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole('button', { name: '비밀의 책 (미획득)' })[0]
    );
    const dialog = within(
      within(canvasElement.ownerDocument.body).getByRole('dialog')
    );
    await waitFor(() =>
      expect(dialog.getByRole('heading', { name: '비밀의 책' })).toBeVisible()
    );
    await expect(
      dialog.queryByRole('button', { name: '책 펼쳐보기' })
    ).not.toBeInTheDocument();
    await expect(dialog.queryByText('0127의 날')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};

/** 실제 컴포넌트에서 아트 원본과 같은 크기로 비교하는 9종 검수 화면. */
export const StoryCoverArtwork: Story = {
  render: () => {
    const badges = computeBadges({
      books: [],
      readingGoal: null,
      firstTasteAnalysisAt: null,
    });
    return (
      <div className='grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3'>
        {badges
          .filter((b) => b.kind === 'story')
          .map((b) => (
            <div key={b.id} className='flex flex-col items-center gap-3'>
              <BadgeMedal badge={{ ...b, earned: true }} size={220} />
              <span className='text-sm text-text-strong'>{b.name}</span>
            </div>
          ))}
      </div>
    );
  },
};

export const MilestonesAndReread: Story = {
  args: {
    books: [
      ...books.map((b) => ({ ...b, read_count: 1 })),
      createTestBook({
        id: 'second-reading',
        isbn: books[0]!.isbn,
        completed_date: '2026-02-01',
        read_count: 1,
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: '책장 · 1권 (획득)' })
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: '책장 · 10권 (획득)' })
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: '책장 · 50권 (미획득)' })
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: '다시 펼친 책 (획득)' })
    ).toBeVisible();
    const locked = canvas.getByRole('button', {
      name: '한 줄 평론가 (미획득)',
    });
    const artwork = locked.querySelector('[data-badge-artwork]')!;
    await expect(artwork).toHaveStyle({ opacity: '0' });
    await userEvent.click(locked);
    const dialog = within(
      within(canvasElement.ownerDocument.body).getByRole('dialog')
    );
    await waitFor(() =>
      expect(
        dialog.getByRole('heading', { name: '한 줄 평론가' })
      ).toBeVisible()
    );
    await waitFor(() =>
      expect(
        dialog
          .getByRole('heading', { name: '한 줄 평론가' })
          .closest('[role=dialog]')!
          .querySelector('[data-badge-artwork]')
      ).toHaveStyle({ opacity: '0.85' })
    );
    await userEvent.keyboard('{Escape}');
  },
};

export const IdleShine: Story = {
  render: () => (
    <BadgeMedal
      badge={{
        ...computeBadges({
          books: [],
          readingGoal: null,
          firstTasteAnalysisAt: null,
        }).find((b) => b.id === 'life-book')!,
        earned: true,
      }}
      size={192}
    />
  ),
  play: async ({ canvasElement }) => {
    const cover = canvasElement.querySelector(
      '[data-badge-book] > div:last-child'
    )!;
    const frame = getComputedStyle(cover, '::before');
    await expect(
      parseFloat(frame.left) + parseFloat(frame.borderLeftWidth)
    ).toBeLessThanOrEqual(0);
    const shine = getComputedStyle(cover, '::after');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(shine.animationIterationCount).toBe('infinite');
      await expect(shine.animationDuration).toBe('7s');
    } else {
      await expect(shine.animationName).toBe('none');
    }
  },
};
