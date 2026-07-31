import { BookCover } from './BookCover';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 책 표지 셀 — **이 시스템의 얼굴**이다. 앱 15곳이 쓴다.
 *
 * ## 왜 컴포넌트인가
 *
 * 표지는 **왼쪽이 책등이라 각지고 오른쪽만 둥근** 비대칭 radius 다.
 * Tailwind 로 표현할 수 없어 `.book-cover` 유틸로 두고 여기서 붙인다.
 * 화면마다 손으로 적으면 곧 갈라진다 — 실제로 갈라져 있었다(아래 참고).
 *
 * ## 크기는 계단으로만 정한다
 *
 * 예전에는 크기를 호출부가 `className='h-20 w-auto'` 로 정했다. 그 결과
 * 15곳의 값이 전부 달랐다 — 44×64 · 56×80 · 64×92 · 64×96 · 120×174 · 200×290,
 * 비율은 1.43 부터 1.50 까지. 같은 컴포넌트인데 화면마다 다른 물건이었다.
 *
 * 실측해 보니 렌더 높이는 **64 · 80 · 96 · 128 · 160px 다섯 종류로 수렴**해
 * 있었고 그 사이 값은 없었다. 그 계단에 이름을 붙였다.
 *
 * | size | 높이 | 쓰는 자리 |
 * | --- | --- | --- |
 * | `xs` | 64px | 달력 셀 |
 * | `sm` | 80px | 목록·랭킹 한 줄 (기본) |
 * | `md` | 96px | 활동 카드 |
 * | `lg` | 128px | 분석 결과·비교 화면 |
 * | `xl` | 160px | 랜딩 히어로 |
 * | `full` | 컬럼 폭 | 상세 페이지 — 표지가 한 칸을 통째로 차지할 때 |
 * | `fill` | 부모 크기 | 격자 셀. 부모에 `relative` 와 크기가 있어야 한다 |
 *
 * **너비는 주지 않는다.** `--book-cover-ratio`(1:1.45)에서 파생된다.
 * 판형이 다른 책이 섞여도 목록의 표지 폭이 흔들리지 않는 이유다.
 *
 * ## 값은 전부 토큰이다
 *
 * 모서리·책등 음영·표지 면이 CSS 변수로 올라가 있다(`styles/index.css`).
 * 책등을 두껍게 하고 싶으면 `--book-spine-width` 하나를 고치면 되고,
 * 다크 모드에서 음영이 흰 하이라이트로 뒤집히는 것도 변수 재정의로 처리한다.
 *
 * ## 표지가 없으면 제목을 조판한다
 *
 * 빈 회색 상자보다 무슨 책인지 아는 편이 낫다. `author` 를 주면 두 줄 조판이
 * 되어 표지를 크게 놓는 자리에서 허전함이 줄어든다. 이미지와 **같은 상자**를
 * 쓰므로 호출부는 "표지가 있을 때/없을 때"를 따로 적지 않는다.
 *
 * ## 접근성
 *
 * 제목이 표지 옆에 이미 적혀 있으면 `decorative` 를 준다. 그러지 않으면
 * 스크린리더가 같은 제목을 두 번 읽는다.
 */
const meta = {
  title: 'Domain/BookCover',
  component: BookCover,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    src: {
      control: 'text',
      description: '없거나 빈 문자열이면 제목을 조판한다.',
      table: { category: 'Content' },
    },
    title: {
      control: 'text',
      description: '대체 조판에 쓰이고 이미지의 alt 가 된다.',
      table: { category: 'Content' },
    },
    author: {
      control: 'text',
      description: '주면 대체 조판이 두 줄(제목 위 · 저자 아래)이 된다.',
      table: { category: 'Content' },
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'full', 'fill'],
      description: '높이 계단. 너비는 판형 비율에서 파생된다.',
      table: { category: 'Appearance', defaultValue: { summary: 'sm' } },
    },
    decorative: {
      control: 'boolean',
      description: '제목이 옆에 이미 있을 때. 스크린리더에서 감춘다.',
      table: { category: 'Accessibility', defaultValue: { summary: 'false' } },
    },
    priority: {
      control: 'boolean',
      description: 'LCP 에 걸리는 큰 표지에만.',
      table: { category: 'Performance', defaultValue: { summary: 'false' } },
    },
  },
  args: {
    title: '아무튼, 계속',
  },
} satisfies Meta<typeof BookCover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 컨트롤에서 size 를 바꿔 가며 확인한다. */
export const Playground: Story = {};

/**
 * 다섯 계단. **높이만 지정했는데 너비가 전부 같은 비율로 따라온다** —
 * 이것이 목록 정렬이 흔들리지 않는 이유다.
 */
export const Sizes: Story = {
  render: (args) => (
    <div className='flex items-end gap-4'>
      <BookCover {...args} size='xs' />
      <BookCover {...args} size='sm' />
      <BookCover {...args} size='md' />
      <BookCover {...args} size='lg' />
      <BookCover {...args} size='xl' />
    </div>
  ),
};

/**
 * 책등 — 왼쪽 모서리가 각지고, 종이 두께를 그라디언트로 만든다.
 *
 * 그림자로 띄우지 않는다. 교보 홈의 box-shadow 는 2개, 밀리는 표지 254개
 * 전수 0개다(00_docs/07 실측). 입체는 그림자가 아니라 이 1px 음영이 만든다.
 */
export const Spine: Story = {
  render: (args) => (
    <div className='flex items-end gap-6'>
      <div className='text-center'>
        <BookCover {...args} size='xl' />
        <p className='mt-2 text-xs text-text-subtle'>왼쪽이 책등</p>
      </div>
      <div className='text-center'>
        <div className='[--book-spine-width:20px] [--book-spine-fold:8px]'>
          <BookCover {...args} size='xl' />
        </div>
        <p className='mt-2 text-xs text-text-subtle'>변수로 두껍게</p>
      </div>
    </div>
  ),
};

/** 저자를 주면 두 줄이 된다. 표지를 크게 놓는 자리에 쓴다. */
export const FallbackWithAuthor: Story = {
  args: { author: '김미소', size: 'xl' },
};

/** 제목이 길면 4줄까지 보이고 잘린다(`line-clamp-4`). 단어 단위로 끊는다. */
export const LongTitle: Story = {
  args: {
    title: '우리가 빛의 속도로 갈 수 없다면 그래도 우리는 계속 나아간다',
    author: '김초엽',
    size: 'xl',
  },
};

/**
 * 실제 목록 한 조각. 제목이 표지 옆에 이미 있으므로 표지에는 `decorative` 를 준다 —
 * 없으면 스크린리더가 제목을 두 번 읽는다.
 */
export const InList: Story = {
  render: () => (
    <div className='w-80 divide-y divide-line-soft'>
      {[
        { title: '아무튼, 계속', author: '김미소 · 코난북스' },
        { title: '읽었습니다', author: '이다혜 · 위즈덤하우스' },
      ].map((book) => (
        <div key={book.title} className='flex items-center gap-3 py-3'>
          <BookCover title={book.title} decorative size='xs' />
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium text-text-strong'>
              {book.title}
            </p>
            <p className='mt-0.5 truncate text-xs text-text-subtle'>
              {book.author}
            </p>
          </div>
        </div>
      ))}
    </div>
  ),
};
