import { Card, CardContent } from './card';
import { Spinner } from './Spinner';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 영역이 채워지기를 기다리는 표시.
 *
 * ## `label` 은 필수다
 *
 * 돌아가는 아이콘은 **눈으로 보는 사람에게만** "기다리는 중"이다. 스크린리더 사용자는
 * 화면이 비었는지 고장 났는지 알 수 없다. 그래서 `role='status'` + `sr-only` 문구를
 * 컴포넌트가 항상 붙인다 — 손으로 `Loader2` 를 놓던 5곳에는 전부 그게 없었다.
 *
 * 문구는 **무엇을** 불러오는지 밝힌다. "로딩 중"만으로는 화면에 여러 영역이 동시에
 * 로딩될 때 구분이 안 된다.
 *
 * ## Skeleton 과 언제 갈리나
 *
 * | | 쓰는 자리 |
 * | --- | --- |
 * | `Skeleton` | **모양을 아는** 것을 기다릴 때 — 목록·카드·문단. 자리를 잡아 두어 레이아웃이 안 튄다 |
 * | `Spinner` | **모양을 모르거나 자리가 이미 있는** 것을 기다릴 때 — 목록 더 불러오기, 모달 안 첫 로딩, 검색 결과 |
 *
 * 첫 화면을 그릴 때는 대개 `Skeleton` 이 낫다. Spinner 는 "이미 있는 자리에서 무언가
 * 진행 중"임을 알리는 데 강하다.
 *
 * ## 버튼 안에서는 쓰지 않는다
 *
 * `Button` 의 `loading` 을 쓴다. 버튼은 이미 자기 이름을 갖고 있어서 `role='status'` 를
 * 또 두면 스크린리더가 두 번 읽는다.
 *
 * ## 크기
 *
 * 손으로 놓을 때 `h-4`·`h-6`·`h-8` 세 종류로 갈려 있었다. 여기서 3단으로 못 박는다 —
 * `sm`(20px) · `md`(24px, 기본) · `lg`(32px).
 */
const meta = {
  title: 'UI/Spinner',
  component: Spinner,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description:
        '스크린리더가 읽는 문구. 무엇을 불러오는지 밝힌다("로딩 중"만으로는 부족).',
      table: { category: 'Accessibility' },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'sm 20px · md 24px · lg 32px',
      table: { category: 'Appearance', defaultValue: { summary: 'md' } },
    },
    className: {
      control: 'text',
      description: '감싸는 영역에 붙는다. 여백(py-8 등)은 여기서.',
      table: { category: 'Appearance' },
    },
  },
  args: { label: '불러오는 중' },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 세 크기. 목록 안은 sm, 영역은 md, 화면 전체는 lg. */
export const Sizes: Story = {
  render: (args) => (
    <div className='flex items-center gap-8'>
      <Spinner {...args} size='sm' label='작은 영역 불러오는 중' />
      <Spinner {...args} size='md' label='영역 불러오는 중' />
      <Spinner {...args} size='lg' label='화면 불러오는 중' />
    </div>
  ),
};

/** 영역 안에서. 여백은 `className` 으로 준다. */
export const InArea: Story = {
  render: (args) => (
    <Card className='w-80'>
      <CardContent>
        <Spinner {...args} label='댓글을 불러오는 중' className='py-8' />
      </CardContent>
    </Card>
  ),
};

/**
 * 목록 더 불러오기. 이미 내용이 있고 그 아래에서 진행 중임을 알린다 —
 * 이 자리에 Skeleton 을 놓으면 "새 항목이 이만큼 온다"는 잘못된 예고가 된다.
 */
export const LoadingMore: Story = {
  render: (args) => (
    <div className='w-80 divide-y divide-line-soft'>
      {['아무튼, 계속', '읽었습니다'].map((title) => (
        <div key={title} className='py-3'>
          <p className='text-sm font-medium text-text-strong'>{title}</p>
          <p className='mt-0.5 text-xs text-text-subtle'>완독 · 3일 전</p>
        </div>
      ))}
      <Spinner {...args} label='더 불러오는 중' className='py-4' />
    </div>
  ),
};
