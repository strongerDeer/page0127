import { PageContainer } from './PageContainer';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/** 모든 페이지의 최대 폭은 1280px(여백 포함). 모바일 24px, 데스크톱 40px의 좌우 여백을 공유한다. */
const meta = {
  title: 'UI/PageContainer',
  component: PageContainer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: { children: null },
} satisfies Meta<typeof PageContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'space-y-6',
    children: (
      <>
        <h1 className='heading-1'>페이지 제목</h1>
        <div className='rounded-xl border border-line p-6'>
          전체 도서·라운지·리더 찾기·서재는 동일한 최대 폭과 좌우 여백을
          사용합니다.
        </div>
      </>
    ),
  },
};

export const SecondarySurface: Story = {
  args: { ...Default.args, bg: 'sunken' },
};
