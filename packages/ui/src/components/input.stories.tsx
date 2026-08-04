import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 한 줄 입력. 여러 줄은 `Textarea` 를 쓴다.
 *
 * ## 라벨은 반드시 붙인다
 *
 * `placeholder` 를 라벨 대신 쓰지 않는다 — 입력을 시작하는 순간 사라져서
 * "내가 지금 무엇을 적고 있었는지"를 잃는다. `Label` 의 `htmlFor` 와 `Input` 의 `id`
 * 를 맞추면 라벨을 눌러도 입력칸에 포커스가 간다.
 *
 * placeholder 는 **형식의 예시**를 보여주는 자리다("hong@example.com").
 *
 * ## 오류는 `aria-invalid` 로 표시한다
 *
 * 색 클래스를 직접 얹지 말고 `aria-invalid` 를 준다. 테두리·포커스 링이 함께 바뀌고,
 * **스크린리더에도 오류 상태가 전달된다.** 색만 바꾸면 화면을 보는 사람에게만 전달된다.
 * 오류 문구는 `aria-describedby` 로 묶어 무엇이 잘못됐는지 읽히게 한다.
 *
 * ## 모바일 확대 방지
 *
 * 기본 글자 크기가 `text-base`(16px)이고 `md:` 부터 14px 로 내려간다.
 * iOS 사파리는 16px 미만 입력칸에 포커스가 가면 화면을 확대해 버리기 때문이다.
 * 작아 보인다고 모바일에서 `text-sm` 을 주면 그 확대가 되살아난다.
 */
const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'number'],
      description: '모바일 키보드 종류가 여기서 갈린다.',
      table: { category: 'Appearance', defaultValue: { summary: 'text' } },
    },
    placeholder: {
      control: 'text',
      description: '라벨 대신 쓰지 않는다. 형식의 예시를 보여주는 자리다.',
      table: { category: 'Content' },
    },
    disabled: {
      control: 'boolean',
      description: '투명도 50% + 포인터 이벤트 차단.',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
    'aria-invalid': {
      control: 'boolean',
      description: '오류 상태. 테두리·링이 바뀌고 스크린리더에도 전달된다.',
      table: { category: 'State' },
    },
  },
  args: {
    placeholder: '책 제목이나 저자를 입력하세요',
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 라벨과 묶은 기본형. `htmlFor` 와 `id` 를 맞춘다. */
export const WithLabel: Story = {
  render: (args) => (
    <div className='w-80 space-y-2'>
      <Label htmlFor='book-search'>책 검색</Label>
      <Input {...args} id='book-search' />
    </div>
  ),
};

/**
 * 오류. `aria-invalid` 와 `aria-describedby` 를 함께 준다 —
 * 전자가 "잘못됐다", 후자가 "무엇이 잘못됐는지"를 전달한다.
 */
export const Invalid: Story = {
  render: () => (
    <div className='w-80 space-y-2'>
      <Label htmlFor='email'>이메일</Label>
      <Input
        id='email'
        type='email'
        defaultValue='hong@'
        aria-invalid
        aria-describedby='email-error'
      />
      <p id='email-error' className='text-xs text-destructive'>
        올바른 이메일 형식이 아닙니다.
      </p>
    </div>
  ),
};

/** 비활성. 이유를 알려야 한다면 죽이는 대신 안내를 띄우는 편이 낫다. */
export const Disabled: Story = {
  render: (args) => (
    <div className='w-80 space-y-2'>
      <Label htmlFor='disabled-input'>닉네임</Label>
      <Input {...args} id='disabled-input' defaultValue='책벌레' disabled />
      <p className='text-xs text-text-subtle'>
        닉네임은 30일에 한 번 바꿀 수 있어요.
      </p>
    </div>
  ),
};

/** 타입별. 모바일에서 뜨는 키보드가 달라진다. */
export const Types: Story = {
  render: () => (
    <div className='w-80 space-y-3'>
      {/* 모든 입력칸에 이름이 있어야 한다 — password 는 placeholder 를 쓸 수 없으니
          aria-label 로 준다(문서용 예시라 라벨을 따로 두지 않았다) */}
      <Input type='text' placeholder='text — 기본' aria-label='text 입력 예시' />
      <Input
        type='email'
        placeholder='email — @ 가 있는 키보드'
        aria-label='email 입력 예시'
      />
      <Input
        type='password'
        defaultValue='password'
        aria-label='password 입력 예시'
      />
      <Input
        type='search'
        placeholder='search — 지우기 버튼이 붙는다'
        aria-label='search 입력 예시'
      />
      <Input
        type='number'
        placeholder='number — 숫자 키패드'
        aria-label='number 입력 예시'
      />
    </div>
  ),
};

/** 실제 화면 한 조각 — 검색 폼. */
export const RealWorld: Story = {
  render: () => (
    <form className='flex w-96 items-end gap-2'>
      <div className='flex-1 space-y-2'>
        <Label htmlFor='search'>책 검색</Label>
        <Input id='search' type='search' placeholder='제목, 저자, ISBN' />
      </div>
      <Button type='submit'>검색</Button>
    </form>
  ),
};
