import { Button } from '@/shared/ui/button';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/** 렌더 중에 일부러 터지는 컴포넌트 — 경계가 잡는지 보여주기 위한 것 */
const Boom = () => {
  throw new Error('책 목록을 불러오지 못했습니다');
};

/**
 * 하위 컴포넌트가 렌더 중에 터졌을 때 **화면 전체가 백지가 되는 것**을 막는다.
 *
 * React 는 렌더 중 예외를 잡지 못하면 트리 전체를 언마운트한다. 즉 목록 하나가 터졌을 뿐인데
 * 헤더·네비게이션까지 통째로 사라진다. 경계를 씌우면 그 안쪽만 대체 UI 로 바뀌고
 * 나머지는 살아 있다.
 *
 * ## 어디에 씌우나
 *
 * **화면 전체가 아니라 "따로 실패할 수 있는 단위"에 씌운다.** 앱 최상단에 하나만 두면
 * 결국 백지와 다를 바 없다. 목록·차트·위젯처럼 독립적으로 데이터를 가져오는 곳마다 둔다.
 *
 * ## 잡지 못하는 것
 *
 * Error Boundary 는 **렌더 중 예외만** 잡는다. 아래는 못 잡는다:
 *
 * - 이벤트 핸들러 안의 예외 (`onClick` 에서 던진 것) — try/catch 로 직접 처리한다
 * - `setTimeout` · Promise 안의 예외
 * - 서버 사이드 렌더링 중의 예외
 * - 경계 **자기 자신**이 터진 경우
 *
 * ## fallback 을 주는 법
 *
 * 안 주면 공통 `ErrorFallback`(다시 시도 · 페이지 새로고침)이 뜬다.
 * 직접 주려면 `fallback` 에 노드를 넘긴다. **`fallback={null}` 도 유효하다** —
 * "이 자리는 실패하면 그냥 비워라"는 뜻이고, 코드가 `undefined` 와 `null` 을 구분해 처리한다.
 *
 * ## 클래스 컴포넌트인 이유
 *
 * `getDerivedStateFromError` · `componentDidCatch` 에 대응하는 훅이 아직 없다.
 * 이 파일이 앱에서 유일한 클래스 컴포넌트다.
 */
const meta = {
  title: 'UI/ErrorBoundary',
  component: ErrorBoundary,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: '감쌀 내용. 이 안에서 렌더 중 터진 예외를 잡는다.',
      table: { category: 'Content' },
    },
    fallback: {
      description:
        '대체 UI. 안 주면 공통 ErrorFallback. null 을 주면 아무것도 그리지 않는다.',
      table: { category: 'Content' },
    },
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 아무 일도 없을 때는 그냥 통과시킨다. */
export const Normal: Story = {
  args: {
    children: (
      <div className='w-80 rounded-lg border border-line bg-card p-5'>
        <p className='text-sm text-text-body'>정상적으로 그려진 내용입니다.</p>
      </div>
    ),
  },
};

/**
 * 안쪽이 터졌을 때. 기본 `ErrorFallback` 이 뜨고 **바깥은 살아 있다** —
 * 위아래 문장이 그대로 남아 있는 것이 핵심이다.
 */
export const Caught: Story = {
  args: { children: <Boom /> },
  render: (args) => (
    <div className='w-[560px] space-y-3'>
      <p className='text-sm text-text-subtle'>
        ↓ 이 위 문장은 경계 밖이라 살아 있습니다
      </p>
      <ErrorBoundary {...args} />
      <p className='text-sm text-text-subtle'>
        ↑ 이 아래 문장도 마찬가지입니다
      </p>
    </div>
  ),
};

/** 직접 만든 대체 UI. 자리의 성격에 맞게 작게 표시할 수 있다. */
export const CustomFallback: Story = {
  args: {
    children: <Boom />,
    fallback: (
      <div className='w-80 rounded-lg border border-line bg-sunken p-4'>
        <p className='text-sm font-medium text-text-strong'>
          목록을 불러오지 못했어요
        </p>
        <p className='mt-1 text-xs text-text-subtle'>
          잠시 후 다시 시도해 주세요.
        </p>
        <Button variant='outline' size='sm' className='mt-3'>
          다시 시도
        </Button>
      </div>
    ),
  },
};

/**
 * `fallback={null}` — 실패하면 그 자리를 그냥 비운다.
 * 사이드바 추천처럼 **없어도 화면이 성립하는** 곁다리에 쓴다.
 *
 * 코드가 `undefined`(prop 을 안 준 경우)와 `null` 을 구분하기 때문에 동작한다.
 * `if (fallback)` 로 짰다면 `null` 이 falsy 라 기본 UI 가 떠 버린다.
 */
export const NullFallback: Story = {
  args: { children: <Boom />, fallback: null },
  render: (args) => (
    <div className='w-[560px] space-y-3'>
      <p className='text-sm text-text-subtle'>↓ 경계 안은 비어 있습니다</p>
      <ErrorBoundary {...args} />
      <p className='text-sm text-text-subtle'>↑ 화면은 그대로 성립합니다</p>
    </div>
  ),
};

/**
 * 경계를 **어디에 씌우느냐**로 결과가 갈린다.
 * 왼쪽은 위젯마다 하나씩, 오른쪽은 전체에 하나만 — 오른쪽은 하나가 터지면 셋 다 사라진다.
 */
export const ScopeMatters: Story = {
  args: { children: null },
  render: () => (
    <div className='flex w-[720px] items-start gap-6'>
      <div className='flex-1 space-y-2'>
        <p className='text-xs font-medium text-primary'>위젯마다 하나씩</p>
        {['이번 주 많이 읽은 책', null, '최근 활동'].map((label, i) => (
          <ErrorBoundary
            key={i}
            fallback={
              <div className='rounded-md border border-line bg-sunken px-3 py-2 text-xs text-text-subtle'>
                이 영역만 불러오지 못했어요
              </div>
            }
          >
            {label ? (
              <div className='rounded-md border border-line bg-card px-3 py-2 text-sm text-text-body'>
                {label}
              </div>
            ) : (
              <Boom />
            )}
          </ErrorBoundary>
        ))}
      </div>

      <div className='flex-1 space-y-2'>
        <p className='text-xs font-medium text-destructive'>전체에 하나만</p>
        <ErrorBoundary
          fallback={
            <div className='rounded-md border border-line bg-sunken px-3 py-2 text-xs text-text-subtle'>
              전부 불러오지 못했어요
            </div>
          }
        >
          <div className='space-y-2'>
            <div className='rounded-md border border-line bg-card px-3 py-2 text-sm text-text-body'>
              이번 주 많이 읽은 책
            </div>
            <Boom />
            <div className='rounded-md border border-line bg-card px-3 py-2 text-sm text-text-body'>
              최근 활동
            </div>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  ),
};
