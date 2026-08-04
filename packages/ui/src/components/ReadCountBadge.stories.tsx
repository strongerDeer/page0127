import { ReadCountBadge } from './ReadCountBadge';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 같은 책을 여러 번 읽었다는 표시. **이 서비스에만 있는 컴포넌트**다.
 *
 * ## 왜 1회독은 안 보이나
 *
 * 등록된 책의 대부분은 1회독이다. 거기에도 "1회독"을 달면 배지가 배경이 되어
 * 아무 신호도 주지 못한다. **배지가 붙어 있다는 사실 자체가 정보**가 되도록
 * 1회독은 아무것도 그리지 않는다(`null` 을 반환한다).
 *
 * 그래서 호출부는 이 컴포넌트가 자리를 차지하지 않을 수 있다는 걸 알아야 한다 —
 * `gap` 으로 간격을 주면 배지가 없을 때 빈 틈이 남지 않지만, 고정 `margin` 을
 * 쓰면 남는다.
 *
 * ## 판정을 직접 적지 말 것
 *
 * 호출부에서 배지 자리를 미리 비워 둘지 결정해야 한다면 `readCount > 1` 을
 * 다시 적지 말고 `shouldShowReadCount()` 를 쓴다. 각자 조건을 적기 시작하면
 * 나중에 규칙이 바뀔 때(예: 3회독부터 표시) 한 곳만 고쳐지고 나머지는 남는다.
 *
 * ```tsx
 * import { ReadCountBadge, shouldShowReadCount } from '@repo/ui';
 *
 * <div className='flex items-center gap-2'>
 *   <span>{book.title}</span>
 *   <ReadCountBadge readCount={book.readCount} size='sm' />
 * </div>
 * ```
 */
const meta = {
  title: 'Domain/ReadCountBadge',
  component: ReadCountBadge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    readCount: {
      control: { type: 'number', min: 0, max: 99 },
      description: '읽은 횟수. 1 이하면 렌더되지 않는다.',
      table: { category: 'Content' },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '시스템 공통 크기 이름. Button·Spinner 와 같은 축이다.',
      table: { category: 'Appearance', defaultValue: { summary: 'md' } },
    },
  },
  args: { readCount: 3 },
} satisfies Meta<typeof ReadCountBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 숫자를 바꿔 가며 확인한다. 1 이하로 내리면 배지가 사라진다. */
export const Playground: Story = {};

/** 크기 3단. 목록 안에서는 sm, 상세 페이지 제목 옆에는 md 를 쓴다. */
export const Sizes: Story = {
  render: (args) => (
    <div className='flex flex-wrap items-center gap-3'>
      <ReadCountBadge {...args} size='sm' />
      <ReadCountBadge {...args} size='md' />
      <ReadCountBadge {...args} size='lg' />
    </div>
  ),
};

/**
 * 경계 — **0회독과 1회독은 아무것도 그리지 않는다.**
 * 아래 줄에서 보이는 것은 2회독부터다.
 */
export const HiddenBelowTwo: Story = {
  render: (args) => (
    <div className='flex items-center gap-3'>
      <span className='text-sm text-text-subtle'>0 ·</span>
      <ReadCountBadge {...args} readCount={0} />
      <span className='text-sm text-text-subtle'>1 ·</span>
      <ReadCountBadge {...args} readCount={1} />
      <span className='text-sm text-text-subtle'>2 ·</span>
      <ReadCountBadge {...args} readCount={2} />
    </div>
  ),
};

/** 두 자리 수도 배지 폭이 자연스럽게 늘어난다. */
export const ManyReads: Story = {
  render: (args) => (
    <div className='flex flex-wrap items-center gap-3'>
      <ReadCountBadge {...args} readCount={2} />
      <ReadCountBadge {...args} readCount={7} />
      <ReadCountBadge {...args} readCount={12} />
    </div>
  ),
};

/**
 * 실제 화면 한 조각 — 서재 목록의 한 줄.
 * 배지가 없는 책과 있는 책이 같은 줄 높이를 유지하는지가 관건이다.
 */
export const RealWorld: Story = {
  render: () => (
    <ul className='w-80 divide-y divide-line-soft rounded-lg border border-line'>
      {[
        { title: '아무튼, 계속', author: '김미소', readCount: 1 },
        { title: '데미안', author: '헤르만 헤세', readCount: 3 },
        { title: '이방인', author: '알베르 카뮈', readCount: 2 },
      ].map((book) => (
        <li key={book.title} className='flex items-center gap-2 p-3'>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-medium text-text-strong'>
              {book.title}
            </p>
            <p className='truncate text-xs text-text-subtle'>{book.author}</p>
          </div>
          <ReadCountBadge readCount={book.readCount} size='sm' />
        </li>
      ))}
    </ul>
  ),
};
