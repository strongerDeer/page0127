import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 로딩 중 자리를 잡아 두는 회색 블록(9개 파일).
 *
 * ## 스피너 대신 쓰는 이유
 *
 * 스피너는 "기다려라"만 말하지만 스켈레톤은 **무엇이 올지**를 미리 보여준다.
 * 그리고 실제 내용이 도착했을 때 레이아웃이 튀지 않는다 — 자리를 미리 차지하고 있어서다.
 * 이 튐(layout shift)은 CLS 점수에 그대로 잡힌다.
 *
 * ## 실제 모양을 흉내 내야 의미가 있다
 *
 * 아무 회색 상자나 늘어놓으면 내용이 도착하는 순간 화면이 재배치된다.
 * **도착할 요소와 같은 크기·같은 개수**로 놓는다. 텍스트 줄이면 줄 높이만큼,
 * 표지면 표지 비율대로.
 *
 * ## 크기는 쓰는 쪽이 정한다
 *
 * 컴포넌트 자체는 색(`bg-line-soft`)·모서리·`animate-pulse` 만 갖는다.
 * 나머지는 `className` 으로 준다.
 *
 * ## 마지막 줄은 짧게
 *
 * 문단을 흉내 낼 때 마지막 줄을 짧게(`w-2/3`) 두면 실제 글처럼 보인다.
 * 모든 줄이 같은 길이면 표처럼 보여서 어색하다.
 */
const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 크기는 className 으로 준다. */
export const Default: Story = {
  args: { className: 'h-4 w-48' },
};

/** 문단. 마지막 줄을 짧게 두면 실제 글처럼 보인다. */
export const TextBlock: Story = {
  render: () => (
    <div className='w-80 space-y-2'>
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-2/3' />
    </div>
  ),
};

/** 책 목록 — 도착할 항목과 같은 크기·같은 개수로 놓는다. */
export const BookList: Story = {
  render: () => (
    <div className='w-80 divide-y divide-line-soft'>
      {[0, 1, 2].map((i) => (
        <div key={i} className='flex items-center gap-3 py-3'>
          <Skeleton className='h-[64px] w-[44px] shrink-0' />
          <div className='min-w-0 flex-1 space-y-2'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-1/2' />
          </div>
        </div>
      ))}
    </div>
  ),
};

/** 카드 안에서. 헤더·본문 구조를 그대로 흉내 낸다. */
export const InCard: Story = {
  render: () => (
    <Card className='w-80'>
      <CardHeader>
        <Skeleton className='h-5 w-32' />
        <Skeleton className='h-3 w-24' />
      </CardHeader>
      <CardContent className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-5/6' />
      </CardContent>
    </Card>
  ),
};

/**
 * 통계 타일. 숫자가 들어올 자리는 숫자 높이로 잡는다 —
 * 작게 잡아 두면 값이 도착할 때 카드가 세로로 늘어난다.
 */
export const StatTiles: Story = {
  render: () => (
    <div className='flex gap-3'>
      {[0, 1].map((i) => (
        <Card key={i} className='w-36'>
          <CardContent className='space-y-2'>
            <Skeleton className='h-3 w-10' />
            <Skeleton className='h-8 w-16' />
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
