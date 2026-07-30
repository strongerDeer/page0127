import { Button } from '@repo/ui';
import { ArrowLeft } from 'lucide-react';

import { PageHeader } from '@/shared/ui/PageHeader';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 페이지 제목과 설명.
 *
 * ## 왜 컴포넌트인가
 *
 * 같은 조합(`heading-1 text-text-strong` + `text-sm text-text-subtle`)이 8곳에서 손으로
 * 쓰이다 **간격이 `mt-1` 과 `mt-2` 로 갈렸다.** 어느 쪽이 맞는지 아무도 모르는 상태가
 * 컴포넌트가 필요하다는 신호였다. 여기서 **8px(`mt-2`)로 통일**한다 — 제목이 28px
 * (데스크톱)라 4px 는 붙어 보인다.
 *
 * ## `<h1>` 은 페이지당 하나
 *
 * 이 컴포넌트가 `<h1>` 을 만든다. 한 페이지에 두 번 쓰지 않는다 —
 * 스크린리더 사용자가 제목 목록으로 페이지를 훑을 때 최상위가 둘이면 구조를 못 읽는다.
 * 섹션 제목은 `.heading-2` 를 직접 쓴다.
 *
 * ## `above` 는 무엇인가
 *
 * 목록으로 돌아가는 링크처럼 **제목보다 먼저 읽혀야 하는 것**을 놓는 자리다.
 * "어디서 왔는지"가 "무엇을 보고 있는지"보다 앞에 오는 편이 자연스럽다.
 * 뒤로가기와 제목 사이는 16px 로, 제목과 설명 사이(8px)보다 넓다 — 성격이 다른
 * 요소라 같은 간격이면 한 덩어리로 읽힌다.
 *
 * ## 쓰지 않는 자리
 *
 * 책 상세(`books/info`)와 문서 페이지(`DocPage`)는 이 컴포넌트를 쓰지 않는다.
 * 전자는 설명이 두 줄이고 색이 다르며(저자는 `text-body`, 출판사는 `text-subtle`),
 * 후자는 아래 구분선과 갱신일이 붙는 별도 레이아웃이다.
 * **비슷해 보인다고 억지로 맞추면 prop 이 늘어나 결국 아무것도 강제하지 못한다.**
 */
const meta = {
  title: 'UI/PageHeader',
  component: PageHeader,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: '<h1> 으로 렌더된다. 페이지당 하나.',
      table: { category: 'Content' },
    },
    description: {
      control: 'text',
      description: '제목 아래 한 줄 설명. 없으면 렌더하지 않는다.',
      table: { category: 'Content' },
    },
    above: {
      description: '제목 위에 놓을 것 — 뒤로가기 링크 등.',
      table: { category: 'Content' },
    },
    className: {
      control: 'text',
      description: '바깥 <header> 에 붙는다. 아래 여백은 여기서.',
      table: { category: 'Appearance' },
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 가장 흔한 형태 — 제목 + 설명. */
export const Default: Story = {
  args: {
    title: '피드',
    description: '함께 읽는 사람들의 새로운 독서 기록을 만나보세요.',
  },
};

/** 설명이 없을 때. 제목만 남고 여백이 따라 붙지 않는다. */
export const TitleOnly: Story = {
  args: { title: '알림' },
};

/** 목록으로 돌아가는 링크가 있을 때. */
export const WithBackLink: Story = {
  args: {
    above: (
      <Button variant='outline' size='sm'>
        <ArrowLeft className='h-4 w-4' />내 서재로
      </Button>
    ),
    title: '독서 취향 분석',
    description: '2026년 7월 30일 분석 · 완독한 책 42권을 읽었습니다',
  },
};

/** 제목이 길어져도 줄바꿈된다. 설명은 그 아래로 밀린다. */
export const LongTitle: Story = {
  args: {
    title: "'우리가 빛의 속도로 갈 수 없다면' 검색 결과",
    description: '12권을 찾았어요.',
  },
};

/**
 * 오른쪽에 조작을 두는 화면. `PageHeader` 는 그 배치를 맡지 않는다 —
 * 감싸는 쪽에서 `flex justify-between` 을 준다. 헤더가 레이아웃까지 떠안으면
 * 화면마다 다른 요구가 prop 으로 쌓인다.
 */
export const WithSideAction: Story = {
  args: { title: '전체 도서', description: '1,204권이 등록돼 있어요.' },
  render: (args) => (
    <div className='flex items-center justify-between gap-4'>
      <PageHeader {...args} />
      <Button variant='outline' size='sm'>
        정렬
      </Button>
    </div>
  ),
};
