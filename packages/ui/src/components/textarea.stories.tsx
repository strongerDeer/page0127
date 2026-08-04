import { Button } from './button';
import { Label } from './label';
import { Textarea } from './textarea';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 여러 줄 입력. 한 줄이면 `Input` 을 쓴다.
 *
 * ## 내용에 맞춰 저절로 늘어난다
 *
 * `field-sizing-content` 가 걸려 있어 **입력하는 만큼 높이가 자란다.** 스크롤바가 생기지 않고
 * 사용자가 쓴 글 전체가 보인다. 최소 높이는 `min-h-16`(64px)이고, 더 크게 시작하고 싶으면
 * `min-h-*` 로 덮는다.
 *
 * 높이를 고정하고 싶다면 `h-*` 를 주면 되지만, 그러면 긴 글에서 스크롤이 생겨
 * 사용자가 자기 글을 한눈에 못 본다 — 정말 필요한 경우에만.
 *
 * ## 라벨과 오류는 Input 과 같은 규칙
 *
 * - `placeholder` 를 라벨 대신 쓰지 않는다(입력을 시작하면 사라진다)
 * - 오류는 색이 아니라 `aria-invalid` 로 표시하고 `aria-describedby` 로 이유를 묶는다
 * - 기본 글자가 16px 이고 `md:` 부터 14px 인 이유는 iOS 사파리가 16px 미만 입력칸에서
 *   화면을 확대하기 때문이다
 *
 * ## 글자 수 제한
 *
 * `maxLength` 만 걸면 사용자는 왜 더 안 써지는지 모른다. **남은 글자 수를 옆에 보여주고**
 * 그 안내를 `aria-describedby` 로 묶는다.
 */
const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      description: '라벨 대신 쓰지 않는다. 무엇을 쓸지 예시를 보여주는 자리다.',
      table: { category: 'Content' },
    },
    rows: {
      control: 'number',
      description:
        'field-sizing-content 가 높이를 내용에 맞추므로 보통 필요 없다.',
      table: { category: 'Appearance' },
    },
    disabled: {
      control: 'boolean',
      description: '투명도 50% + 커서 차단.',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
    'aria-invalid': {
      control: 'boolean',
      description: '오류 상태. 스크린리더에도 전달된다.',
      table: { category: 'State' },
    },
  },
  args: {
    placeholder: '기억하고 싶은 문장이나 생각을 적어 보세요',
    className: 'w-80',
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 라벨과 묶은 기본형. */
export const WithLabel: Story = {
  render: (args) => (
    <div className='w-80 space-y-2'>
      <Label htmlFor='note'>메모</Label>
      <Textarea {...args} id='note' className='w-full' />
    </div>
  ),
};

/**
 * 내용이 길어지면 높이가 따라 늘어난다 — 스크롤바가 생기지 않는다.
 * 왼쪽은 짧은 글, 오른쪽은 긴 글이다.
 */
export const GrowsWithContent: Story = {
  render: () => (
    <div className='flex w-[560px] items-start gap-4'>
      <Textarea
        className='flex-1'
        defaultValue='좋았다.'
        aria-label='짧은 메모'
      />
      <Textarea
        className='flex-1'
        defaultValue={
          '읽는 일에 대해 오래 생각해온 사람의 기록이다. ' +
          '책을 좋아한다는 말로는 부족한, 읽기라는 습관 그 자체에 대한 이야기. ' +
          '무언가를 계속한다는 것이 어떤 모양인지 보여준다.'
        }
        aria-label='긴 메모'
      />
    </div>
  ),
};

/** 오류. `aria-invalid` 로 표시하고 이유를 `aria-describedby` 로 묶는다. */
export const Invalid: Story = {
  render: () => (
    <div className='w-80 space-y-2'>
      <Label htmlFor='review'>한 줄 감상</Label>
      <Textarea
        id='review'
        className='w-full'
        defaultValue={'  '}
        aria-invalid
        aria-describedby='review-error'
      />
      <p id='review-error' className='text-xs text-destructive'>
        공백만으로는 저장할 수 없어요.
      </p>
    </div>
  ),
};

/** 비활성. */
export const Disabled: Story = {
  render: (args) => (
    <div className='w-80 space-y-2'>
      <Label htmlFor='disabled-note'>메모</Label>
      <Textarea
        {...args}
        id='disabled-note'
        className='w-full'
        defaultValue='완독한 뒤에 쓸 수 있어요.'
        disabled
      />
    </div>
  ),
};

/**
 * 글자 수 제한. `maxLength` 만 걸면 왜 더 안 써지는지 알 수 없으니
 * 남은 수를 보여주고 `aria-describedby` 로 묶는다.
 */
export const WithCounter: Story = {
  render: () => (
    <div className='w-80 space-y-2'>
      <Label htmlFor='counted'>한 줄 감상</Label>
      <Textarea
        id='counted'
        className='w-full'
        maxLength={200}
        defaultValue='읽는 일에 대해 오래 생각해온 사람의 기록이다.'
        aria-describedby='counted-help'
      />
      <p id='counted-help' className='text-right text-xs text-text-subtle'>
        44 / 200
      </p>
    </div>
  ),
};

/** 실제 화면 한 조각 — 기록 남기기. */
export const RealWorld: Story = {
  render: () => (
    <form className='w-96 space-y-4 rounded-lg border border-line bg-card p-5'>
      <div>
        <p className='text-base font-medium text-text-strong'>아무튼, 계속</p>
        <p className='mt-0.5 text-sm text-text-subtle'>김미소 · 코난북스</p>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='rw-note'>이 책을 어떻게 읽었나요</Label>
        <Textarea
          id='rw-note'
          className='w-full'
          placeholder='기억하고 싶은 문장이나 생각을 적어 보세요'
        />
      </div>
      <div className='flex justify-end gap-2'>
        <Button variant='outline' type='button'>
          나중에
        </Button>
        <Button type='submit'>기록 저장</Button>
      </div>
    </form>
  ),
};
