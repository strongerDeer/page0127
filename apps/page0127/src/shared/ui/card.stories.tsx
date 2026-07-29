import { Button } from '@/shared/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 내용을 묶는 흰 표면. 앱에서 두 번째로 많이 쓴다(18개 파일).
 *
 * ## 슬롯 구조
 *
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>제목</CardTitle>
 *     <CardDescription>보조 설명</CardDescription>
 *     <CardAction><Button/></CardAction>  // 헤더 오른쪽 끝
 *   </CardHeader>
 *   <CardContent>본문</CardContent>
 *   <CardFooter>바닥</CardFooter>
 * </Card>
 * ```
 *
 * `Card` 가 세로 간격(`gap-5`)과 위아래 여백을 갖고, **가로 여백은 각 슬롯이 갖는다**
 * (`px-6`). 그래서 `CardContent` 안에 이미지를 가장자리까지 붙이려면
 * `-mx-6` 로 되돌리면 된다.
 *
 * ## 경계는 선이지 그림자가 아니다
 *
 * `border-line-soft` 1px 로만 구분한다. 그림자를 더하지 않는다 — 카드는 페이지에
 * 얹힌 종이가 아니라 페이지의 한 구획이다(07 원칙 2). 카드 면은 흰색을 유지하고
 * 브랜드 블루는 CTA·선택 상태에만 쓴다.
 *
 * ## 언제 쓰지 않나
 *
 * 목록의 항목 하나하나를 카드로 감싸면 경계선이 줄줄이 겹쳐 오히려 읽기 어려워진다.
 * 그럴 땐 카드 하나 안에 `line-soft` 로 항목을 나누는 편이 낫다.
 */
const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 가장 흔한 형태 — 제목 + 본문. */
export const Default: Story = {
  render: () => (
    <Card className='w-80'>
      <CardHeader>
        <CardTitle>이번 주 많이 읽은 책</CardTitle>
        <CardDescription>최근 7일 완독 기준</CardDescription>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-text-body'>
          같은 책을 여러 번 읽어도 한 번으로 셉니다.
        </p>
      </CardContent>
    </Card>
  ),
};

/** `CardAction` 은 헤더 오른쪽 끝에 붙는다. 제목이 길어져도 자리를 지킨다. */
export const WithAction: Story = {
  render: () => (
    <Card className='w-96'>
      <CardHeader>
        <CardTitle>내 책장</CardTitle>
        <CardDescription>완독 42권 · 읽는 중 3권</CardDescription>
        <CardAction>
          <Button variant='ghost' size='sm'>
            전체 보기
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-text-body'>
          책장이 쌓이면 AI가 취향을 읽어 다음 책을 건넵니다.
        </p>
      </CardContent>
    </Card>
  ),
};

/** 바닥에 행동을 두는 형태. 구분선이 필요하면 `border-t` 를 주면 여백이 따라온다. */
export const WithFooter: Story = {
  render: () => (
    <Card className='w-96'>
      <CardHeader>
        <CardTitle>아직 기록이 없어요</CardTitle>
        <CardDescription>첫 책을 담으면 여기 쌓입니다</CardDescription>
      </CardHeader>
      <CardFooter className='border-t'>
        <Button className='w-full'>책 찾아보기</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * 헤더 없이 본문만. 통계 타일처럼 제목이 필요 없는 자리에 쓴다.
 * 이때 `CardContent` 하나만 두면 `Card` 의 위아래 여백(`py-5`)이 그대로 살아난다.
 */
export const ContentOnly: Story = {
  render: () => (
    <div className='flex gap-3'>
      <Card className='w-36'>
        <CardContent>
          <p className='text-xs text-text-subtle'>완독</p>
          <p className='mt-1 text-2xl font-medium text-text-strong'>42</p>
        </CardContent>
      </Card>
      <Card className='w-36'>
        <CardContent>
          <p className='text-xs text-text-subtle'>읽는 중</p>
          <p className='mt-1 text-2xl font-medium text-text-strong'>3</p>
        </CardContent>
      </Card>
    </div>
  ),
};

/**
 * 목록은 카드를 겹쳐 쌓지 않는다. 카드 하나 안에서 `line-soft` 로 나눈다 —
 * 항목마다 카드를 두르면 경계선이 이중으로 겹쳐 오히려 읽기 어렵다.
 */
export const ListInsideOneCard: Story = {
  render: () => (
    <Card className='w-96'>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
      </CardHeader>
      <CardContent className='divide-y divide-line-soft'>
        {[
          { name: '아무튼, 계속', meta: '완독 · 3일 전' },
          { name: '읽었습니다', meta: '담기 · 5일 전' },
          { name: '동물농장', meta: '완독 · 1주 전' },
        ].map((item) => (
          <div key={item.name} className='py-3 first:pt-0 last:pb-0'>
            <p className='text-sm font-medium text-text-strong'>{item.name}</p>
            <p className='mt-0.5 text-xs text-text-subtle'>{item.meta}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  ),
};
