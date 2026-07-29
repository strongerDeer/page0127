import { BookCover } from '@/shared/ui/BookCover';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 책 표지 셀. 도메인 셰이프를 한 곳에서 책임진다(14개 파일이 쓴다).
 *
 * ## 왜 컴포넌트인가
 *
 * 표지는 **왼쪽이 책등이라 각지고 오른쪽만 둥근** 비대칭 radius(`2px 6px 6px 2px`)다.
 * Tailwind 로 표현할 수 없어 `globals.css` 의 `.book-cover` 유틸로 두고 여기서 붙인다.
 * 화면마다 손으로 적으면 곧 갈라지므로 한 곳에 모았다.
 *
 * ## 크기를 강제하지 않는다
 *
 * 표지는 문맥마다 다른 크기로 놓인다(목록의 56px, 상세의 200px). 그래서 크기는
 * 쓰는 쪽이 `className` 으로 정한다.
 *
 * ## 표지가 없으면 제목을 조판한다
 *
 * 빈 회색 상자보다 무슨 책인지 아는 편이 낫다. `author` 를 주면 두 줄 조판이 되어
 * 표지를 크게 놓는 자리에서 허전함이 줄어든다.
 *
 * ⚠️ **`.book-cover` 는 `@layer` 밖이라 모든 Tailwind 유틸을 이긴다.**
 * `bg-sunken` 이나 `rounded-md` 로 덮으려는 시도는 조용히 실패한다 — 실제로 이 컴포넌트
 * 이전 코드가 `bg-sunken` 을 적어 뒀지만 한 번도 적용된 적이 없었다.
 *
 * ## 접근성
 *
 * 제목이 표지 옆에 이미 적혀 있으면 `decorative` 를 준다. 그러지 않으면 스크린리더가
 * 같은 제목을 두 번 읽는다.
 */
const meta = {
  title: 'UI/BookCover',
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

/** 표지 이미지가 없을 때 — 제목을 조판한다. */
export const Fallback: Story = {
  args: { className: 'w-25 h-[145px]' },
};

/** 저자를 주면 두 줄이 된다. 표지를 크게 놓는 자리에 쓴다. */
export const FallbackWithAuthor: Story = {
  args: {
    author: '김미소',
    className: 'w-35 h-50 text-sm',
  },
};

/** 제목이 길면 4줄까지 보이고 잘린다(`line-clamp-4`). 단어 단위로 끊는다. */
export const LongTitle: Story = {
  args: {
    title: '우리가 빛의 속도로 갈 수 없다면 그래도 우리는 계속 나아간다',
    author: '김초엽',
    className: 'w-25 h-[145px]',
  },
};

/** 목록에서 쓰는 크기. 셰이프가 작아도 책등이 보인다. */
export const Sizes: Story = {
  render: () => (
    <div className='flex items-end gap-4'>
      <BookCover title='아무튼, 계속' className='h-20 w-14' />
      <BookCover title='아무튼, 계속' className='h-29 w-20' />
      <BookCover
        title='아무튼, 계속'
        author='김미소'
        className='h-50 w-35 text-sm'
      />
    </div>
  ),
};

/**
 * 실제 목록 한 조각. 제목이 표지 옆에 이미 있으므로 표지에는 `decorative` 를 준다 —
 * 없으면 스크린리더가 "아무튼, 계속"을 두 번 읽는다.
 */
export const InList: Story = {
  render: () => (
    <div className='w-80 divide-y divide-line-soft'>
      {[
        { title: '아무튼, 계속', author: '김미소 · 코난북스' },
        { title: '읽었습니다', author: '이다혜 · 위즈덤하우스' },
      ].map((book) => (
        <div key={book.title} className='flex items-center gap-3 py-3'>
          <BookCover
            title={book.title}
            decorative
            className='h-16 w-11 shrink-0'
          />
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
