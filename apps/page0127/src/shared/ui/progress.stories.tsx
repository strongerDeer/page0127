import { Progress } from '@/shared/ui/progress';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 진행률 막대.
 *
 * ## 손으로 그리지 않는다
 *
 * div 두 겹으로도 똑같이 생긴 막대를 만들 수 있지만, 그건 **화면을 보는 사람에게만**
 * 진행률이다. 이 컴포넌트는 Radix 기반이라 `role="progressbar"` 와 `aria-valuenow` ·
 * `aria-valuemin/max` 가 자동으로 붙어 스크린리더가 "45%"를 읽는다.
 *
 * 실제로 `ReadingProgressOverview` 가 손으로 그린 막대를 쓰고 있었고,
 * 그 화면은 스크린리더에서 진행률이 존재하지 않는 것과 같았다.
 *
 * ## `aria-label` 은 필수에 가깝다
 *
 * 막대에는 글자가 없다. 무엇의 진행률인지 옆에 시각적으로 적혀 있어도 스크린리더는
 * 그 연결을 모른다 — `aria-label` 로 "독서 목표 진행률"처럼 붙인다.
 *
 * ## 트랙 색
 *
 * 트랙(아직 안 채워진 부분)은 중립면 `sunken` 이다. shadcn 기본값은
 * `bg-primary/20` 이지만, 07 원칙상 유채색은 직무가 있을 때만 쓴다 — 트랙에는
 * 직무가 없다.
 *
 * ## 두께
 *
 * 기본 `h-2`(8px). 페이지의 주인공인 진행률(연간 목표 등)은 `h-3` 으로 키운다.
 */
const meta = {
  title: 'UI/Progress',
  component: Progress,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: '0~100. 값을 모르면(로딩 중) 주지 않는다.',
      table: { category: 'Content' },
    },
    className: {
      control: 'text',
      description: '두께·너비는 여기서. 기본 h-2.',
      table: { category: 'Appearance' },
    },
  },
  args: {
    value: 45,
    className: 'w-80',
    'aria-label': '독서 목표 진행률',
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 0부터 100까지. 0에서도 트랙은 보인다 — 자리를 알려 줘야 하기 때문이다. */
export const Values: Story = {
  render: (args) => (
    <div className='w-80 space-y-4'>
      {[0, 33, 66, 100].map((value) => (
        <div key={value} className='space-y-1.5'>
          <div className='flex justify-between text-xs text-text-subtle'>
            <span>{value === 100 ? '목표 달성' : '진행 중'}</span>
            <span>{value}%</span>
          </div>
          <Progress {...args} value={value} className='w-full' />
        </div>
      ))}
    </div>
  ),
};

/** 두께. 페이지의 주인공이면 h-3, 목록 안 보조 지표면 h-1.5. */
export const Thickness: Story = {
  render: (args) => (
    <div className='w-80 space-y-4'>
      <Progress {...args} className='h-1.5 w-full' />
      <Progress {...args} className='w-full' />
      <Progress {...args} className='h-3 w-full' />
    </div>
  ),
};

/**
 * 실제 화면 한 조각 — 연간 독서 목표.
 * 숫자를 크게 두고 막대는 그 숫자를 뒷받침한다.
 */
export const RealWorld: Story = {
  render: () => (
    <div className='w-96 rounded-lg border border-line bg-card p-5'>
      <div className='mb-3 flex items-end justify-between gap-4'>
        <div className='flex items-baseline gap-2'>
          <strong className='text-4xl font-bold tracking-[-0.04em] text-text-strong'>
            45
          </strong>
          <span className='font-medium text-text-subtle'>%</span>
        </div>
        <span className='text-sm font-medium text-text-subtle'>27 / 60권</span>
      </div>
      <Progress value={45} className='h-3' aria-label='올해 독서 목표 진행률' />
      <div className='mt-3 grid grid-cols-3 text-xs text-text-subtle'>
        <span>시작</span>
        <span className='text-center'>30권 · 절반</span>
        <span className='text-right'>60권 · 목표</span>
      </div>
    </div>
  ),
};
