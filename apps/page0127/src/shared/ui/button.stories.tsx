import { BookOpen, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 사용자가 누르는 모든 것. Radix `Slot` 기반이라 `asChild` 로 링크에도 씌울 수 있다.
 *
 * ## 어떤 variant 를 쓰나
 *
 * 07 문서(§2.1)가 정한 원칙 하나만 기억하면 된다 —
 * **채워진 `default` 버튼은 한 화면에 하나뿐이다.** 그 화면에서 사용자가 해야 할
 * 단 하나의 행동에만 쓰고, 나머지 행동은 `outline` · `ghost` 로 내린다.
 * 채운 버튼이 둘이면 둘 다 안 눌린다.
 *
 * | variant | 쓰는 자리 |
 * | --- | --- |
 * | `default` | 화면의 주 행동 (기록 시작, 저장, 완독) |
 * | `outline` | 주 행동 옆의 대안 (취소, 둘러보기) |
 * | `ghost` | 툴바·카드 안의 보조 조작. 배경을 차지하면 안 되는 자리 |
 * | `secondary` | 회색 면이 필요한 중립 행동 |
 * | `destructive` | 삭제·탈퇴 **전용**. 경고 표시에는 쓰지 않는다 |
 * | `link` | 문장 안에 섞이는 행동 |
 *
 * ## 접근성
 *
 * - `size='icon'` 계열은 글자가 없다 → **`aria-label` 이 필수**다.
 *   없으면 스크린리더가 "버튼"이라고만 읽는다.
 * - 포커스 링은 `focus-visible` 에만 붙는다 — 마우스로 눌렀을 때는 안 보이고
 *   키보드 `Tab` 으로 왔을 때만 보인다. 이 링을 `outline-none` 으로 지우지 말 것.
 * - `disabled` 는 포인터 이벤트까지 막는다. 이유를 알려야 하는 상황이라면
 *   버튼을 죽이는 대신 눌렀을 때 안내를 띄우는 편이 낫다.
 *
 * ## 사용 예시
 *
 * ```tsx
 * <Button>기록 시작하기</Button>
 * <Button variant='outline'>취소</Button>
 * <Button size='icon' aria-label='책 추가'><Plus /></Button>
 *
 * // 링크로 쓰기 — a 태그가 되면서 버튼 스타일만 물려받는다
 * <Button asChild>
 *   <Link href='/books'>내 책장</Link>
 * </Button>
 * ```
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
      description: '버튼의 시각적 무게. 화면당 default 는 하나만.',
      table: { category: 'Appearance', defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg'],
      description: 'icon 계열은 정사각형이며 aria-label 이 필요하다.',
      table: { category: 'Appearance', defaultValue: { summary: 'default' } },
    },
    children: {
      control: 'text',
      description: '버튼 안에 들어갈 내용. 보통 동사로 끝나는 짧은 문구.',
      table: { category: 'Content' },
    },
    disabled: {
      control: 'boolean',
      description: '비활성. 투명도 50% + 포인터 이벤트 차단.',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
    loading: {
      control: 'boolean',
      description:
        '요청 진행 중. 스피너를 앞에 붙이고 버튼을 잠근다(aria-busy).',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
    asChild: {
      control: 'boolean',
      description:
        '자식 엘리먼트에 스타일만 입힌다. Link 를 버튼처럼 보이게 할 때 쓴다.',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
    onClick: {
      description: '클릭 핸들러.',
      table: { category: 'Events' },
    },
  },
  args: {
    children: '기록 시작하기',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 컨트롤 패널에서 prop 을 바꿔 가며 확인하는 기본 스토리. */
export const Playground: Story = {};

/** 6가지 variant 전부. 무게 순서대로 놓았다. */
export const Variants: Story = {
  render: (args) => (
    <div className='flex flex-wrap items-center gap-3'>
      <Button {...args} variant='default'>
        default
      </Button>
      <Button {...args} variant='outline'>
        outline
      </Button>
      <Button {...args} variant='secondary'>
        secondary
      </Button>
      <Button {...args} variant='ghost'>
        ghost
      </Button>
      <Button {...args} variant='link'>
        link
      </Button>
      <Button {...args} variant='destructive'>
        destructive
      </Button>
    </div>
  ),
};

/** 높이 3단(32/36/40px). 본문 흐름 안에서는 sm, 페이지 주 행동은 lg. */
export const Sizes: Story = {
  render: (args) => (
    <div className='flex flex-wrap items-center gap-3'>
      <Button {...args} size='sm'>
        sm · 32px
      </Button>
      <Button {...args} size='default'>
        default · 36px
      </Button>
      <Button {...args} size='lg'>
        lg · 40px
      </Button>
    </div>
  ),
};

/**
 * 정사각 아이콘 버튼. **`aria-label` 을 빼면 접근성 패널에 위반으로 잡힌다** —
 * 글자가 없어 스크린리더가 읽을 이름이 사라지기 때문이다.
 */
export const IconOnly: Story = {
  render: (args) => (
    <div className='flex flex-wrap items-center gap-3'>
      <Button {...args} size='icon-sm' variant='ghost' aria-label='책 추가'>
        <Plus />
      </Button>
      <Button {...args} size='icon' variant='outline' aria-label='책 추가'>
        <Plus />
      </Button>
      <Button {...args} size='icon-lg' aria-label='책 추가'>
        <Plus />
      </Button>
    </div>
  ),
};

/** 아이콘은 글자 왼쪽에 둔다. 크기·간격은 컴포넌트가 알아서 맞춘다. */
export const WithIcon: Story = {
  render: (args) => (
    <div className='flex flex-wrap items-center gap-3'>
      <Button {...args}>
        <BookOpen />
        읽기 시작
      </Button>
      <Button {...args} variant='outline'>
        <Plus />책 추가
      </Button>
      <Button {...args} variant='destructive'>
        <Trash2 />
        삭제
      </Button>
    </div>
  ),
};

/**
 * 요청이 진행 중일 때. `loading` 이 스피너를 붙이고 버튼을 잠근다.
 *
 * **버튼 안 로딩에는 `Spinner` 컴포넌트를 쓰지 않는다** — 버튼은 이미 자기 이름을
 * 갖고 있어서 `role='status'` 를 또 두면 스크린리더가 두 번 읽는다.
 * 여기서는 `aria-busy` 로 "이 버튼이 일하는 중"만 알린다.
 *
 * 글자가 없는 버튼(아래 세 번째)은 `aria-label` 이 필요하다 — 스피너만 남으면
 * 읽을 이름이 사라진다.
 */
export const Loading: Story = {
  render: (args) => (
    <div className='flex flex-wrap items-center gap-3'>
      <Button {...args} loading>
        저장 중
      </Button>
      <Button {...args} variant='outline' loading>
        불러오는 중
      </Button>
      <Button {...args} size='icon' loading aria-label='불러오는 중' />
    </div>
  ),
};

/** 비활성 상태. 투명도만 내려가고 색은 그대로다. */
export const Disabled: Story = {
  render: (args) => (
    <div className='flex flex-wrap items-center gap-3'>
      <Button {...args} disabled>
        default
      </Button>
      <Button {...args} variant='outline' disabled>
        outline
      </Button>
      <Button {...args} variant='ghost' disabled>
        ghost
      </Button>
      <Button {...args} variant='destructive' disabled>
        destructive
      </Button>
    </div>
  ),
};

/**
 * 실제 화면 한 조각 — 책 상세의 행동 영역.
 * 채워진 버튼은 "완독"  하나뿐이고, 나머지는 전부 무게를 내렸다.
 */
export const RealWorld: Story = {
  render: () => (
    <div className='w-80 rounded-lg border border-line bg-card p-4'>
      <p className='text-base font-medium text-text-strong'>아무튼, 계속</p>
      <p className='mt-1 text-sm text-text-subtle'>김미소 · 코난북스</p>

      <div className='mt-4 flex items-center gap-2'>
        <Button className='flex-1'>완독으로 기록</Button>
        <Button variant='outline'>담기</Button>
        <Button variant='ghost' size='icon' aria-label='더보기'>
          <Plus />
        </Button>
      </div>
    </div>
  ),
};
