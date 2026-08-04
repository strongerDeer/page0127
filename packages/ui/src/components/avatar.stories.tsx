import { Avatar, AvatarFallback, AvatarImage } from './avatar';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 사용자 얼굴 자리. 기본 크기는 32px(`size-8`)이고 원형이다.
 *
 * ## Fallback 은 선택이 아니다
 *
 * 프로필 이미지는 **없거나 · 깨지거나 · 늦게 온다.** 셋 다 흔하다.
 * `AvatarFallback` 이 없으면 그 순간 빈 원이 남는다. Radix 는 이미지 로딩이 끝날 때까지
 * fallback 을 보여주다가 성공하면 바꿔치기한다 — 그래서 **깜빡임이 없다.**
 *
 * 이니셜은 이름에서 뽑되, 이름이 없으면 `U` 로 떨어뜨린다
 * (`entities/profile` 의 `toInitial` 이 그 규칙을 갖고 있다).
 *
 * ## 접근성 — 아바타는 대개 장식이다
 *
 * 옆에 이름이 이미 적혀 있으면 `alt=''` 를 준다. 그러지 않으면 스크린리더가
 * **같은 이름을 두 번** 읽는다("책벌레 책벌레").
 *
 * 이름이 없이 아바타만 있는 자리(예: 겹쳐 놓은 참여자 목록)에서는 `alt` 에 이름을 넣는다.
 *
 * ## 크기는 쓰는 쪽이 정한다
 *
 * `size-*` 로 덮는다. 목록은 32px, 프로필 헤더는 64px 안팎을 쓴다.
 * 이니셜 글자 크기는 따로 조정해야 한다 — 아바타만 키우면 글자가 그대로라 작아 보인다.
 */
const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: '크기는 여기서(size-*). 기본 size-8(32px).',
      table: { category: 'Appearance' },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE_IMAGE =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop';

/** 이미지가 있을 때. 옆에 이름이 없으므로 `alt` 에 이름을 넣었다. */
export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src={SAMPLE_IMAGE} alt='책벌레' />
      <AvatarFallback>책</AvatarFallback>
    </Avatar>
  ),
};

/** 이미지가 없을 때 — 이니셜로 떨어진다. 이름이 없으면 `U`. */
export const Fallback: Story = {
  render: () => (
    <div className='flex items-center gap-3'>
      <Avatar>
        <AvatarFallback>책</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </div>
  ),
};

/**
 * **이미지 주소가 깨져도 빈 원이 남지 않는다.** 아래는 존재하지 않는 주소를 준 것이고,
 * Radix 가 로딩 실패를 감지해 fallback 으로 되돌린다.
 */
export const BrokenImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src='https://example.invalid/none.png' alt='책벌레' />
      <AvatarFallback>책</AvatarFallback>
    </Avatar>
  ),
};

/**
 * 크기. 아바타만 키우면 이니셜이 그대로라 작아 보이므로 글자 크기도 같이 준다.
 */
export const Sizes: Story = {
  render: () => (
    <div className='flex items-end gap-4'>
      <Avatar className='size-6'>
        <AvatarFallback className='text-xs'>책</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback className='text-sm'>책</AvatarFallback>
      </Avatar>
      <Avatar className='size-12'>
        <AvatarFallback className='text-base'>책</AvatarFallback>
      </Avatar>
      <Avatar className='size-16'>
        <AvatarFallback className='text-xl'>책</AvatarFallback>
      </Avatar>
    </div>
  ),
};

/**
 * 목록에서. 이름이 옆에 이미 있으므로 **`alt=''`** 를 준다 —
 * 없으면 스크린리더가 "책벌레 책벌레"로 두 번 읽는다.
 */
export const InList: Story = {
  render: () => (
    <ul className='w-72 divide-y divide-line-soft'>
      {[
        { name: '책벌레', meta: '완독 42권', initial: '책' },
        { name: '밑줄쟁이', meta: '완독 17권', initial: '밑' },
      ].map((user) => (
        <li key={user.name} className='flex items-center gap-3 py-3'>
          <Avatar>
            <AvatarImage src={SAMPLE_IMAGE} alt='' />
            <AvatarFallback className='text-sm'>{user.initial}</AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium text-text-strong'>
              {user.name}
            </p>
            <p className='mt-0.5 truncate text-xs text-text-subtle'>
              {user.meta}
            </p>
          </div>
        </li>
      ))}
    </ul>
  ),
};

/**
 * 겹쳐 놓은 참여자 목록. 여기서는 이름이 화면에 없으므로 `alt` 에 이름을 넣는다.
 * 링 색은 배경과 같게 줘서 겹친 부분이 잘려 보이게 한다.
 */
export const Stacked: Story = {
  render: () => (
    <div className='flex items-center'>
      {['책', '밑', '독', '완'].map((initial, i) => (
        <Avatar
          key={initial}
          className={`ring-2 ring-background ${i > 0 ? '-ml-2' : ''}`}
        >
          <AvatarFallback className='text-sm'>{initial}</AvatarFallback>
        </Avatar>
      ))}
      <span className='ml-3 text-sm text-text-subtle'>외 12명이 읽었어요</span>
    </div>
  ),
};
