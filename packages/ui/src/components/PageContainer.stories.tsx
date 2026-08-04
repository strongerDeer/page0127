import { BookCover } from './BookCover';
import { Card, CardContent } from './card';
import { PageContainer } from './PageContainer';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 페이지 공통 컨테이너. 모든 페이지의 최대 너비와 바깥 여백을 한 곳에서 정한다
 * (17개 파일이 쓴다 — 사실상 모든 페이지).
 *
 * 페이지마다 `max-w-*` 와 패딩을 손으로 박지 않는다. 손으로 박으면 페이지마다 값이
 * 조금씩 갈라지고, 나중에 기준을 바꿀 때 전부 찾아다녀야 한다.
 *
 * ## 너비 4단계 — 콘텐츠 종류가 정한다
 *
 * | width | 최대 너비 | 쓰는 곳 |
 * | --- | --- | --- |
 * | `narrow` | 3xl | 단일 컬럼 리스트·설정 폼 (피드, 알림, 검색, 설정) |
 * | `content` | 4xl (기본) | 상세·폼 (책 상세/추가/편집, 취향 분석) |
 * | `library` | 6xl | 공개 서재 |
 * | `wide` | 7xl | 데이터 그리드 (대시보드, 전체 도서) |
 *
 * 화면이 넓다고 콘텐츠를 늘리지 않는다. 한 줄이 길어지면 다음 줄 첫 글자를 찾기
 * 어려워져서 읽기가 느려진다.
 *
 * ## 여백은 고정
 *
 * 모바일 24px(`p-6`) / 데스크톱 40px(`md:p-10`). 전 페이지 공통이라 variant 가 없다.
 *
 * ## `className` 은 안쪽으로 간다
 *
 * `space-y-6` 같은 세로 리듬을 페이지가 주입할 수 있게, `className` 은 바깥 래퍼가
 * 아니라 **내부 콘텐츠 래퍼**에 붙는다.
 *
 * ## 배경
 *
 * `bg='sunken'` 은 배경을 한 단 눌러 "책장 바닥"을 만든다. 공개 서재처럼 카드가 여러 개
 * 떠 있는 화면에서 쓴다. 파스텔 그라디언트 배경은 쓰지 않는다 — 실서비스에 없고
 * (교보·밀리 모두 단색) AI 랜딩의 대표 신호다.
 *
 * ## 접근성 — 여기에 `<main>` 을 넣지 않는다
 *
 * 이 컴포넌트는 의도적으로 **`<div>`** 다. 이름이 "페이지 컨테이너"라 `<main>` 으로
 * 만들고 싶어지지만, `<main>` 은 이미 `AppShellLayout` 이 갖고 있다
 * (`id='main-content'`, 스킵 링크의 목적지). 여기서 또 만들면 **랜드마크가 둘**이 되어
 * 스크린리더 사용자가 "본문"을 두 번 만나게 된다 — 어느 쪽이 진짜인지 알 수 없다.
 *
 * 페이지 안에서 구획을 나눠야 하면 `<section aria-labelledby>` 를 `children` 쪽에서 쓴다.
 *
 * 페이지 제목도 이 컴포넌트가 만들지 않는다. `<h1>` 은 각 페이지가 자기 내용으로 정한다.
 */
const meta = {
  title: 'UI/PageContainer',
  component: PageContainer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'select',
      options: ['narrow', 'content', 'library', 'wide'],
      description: '콘텐츠 종류가 정한다. 화면 크기가 아니다.',
      table: { category: 'Layout', defaultValue: { summary: 'content' } },
    },
    bg: {
      control: 'select',
      options: ['default', 'sunken'],
      description: 'sunken 은 배경을 한 단 눌러 책장 바닥을 만든다.',
      table: { category: 'Layout', defaultValue: { summary: 'default' } },
    },
    className: {
      control: 'text',
      description: '내부 콘텐츠 래퍼에 붙는다 (space-y-* 등 세로 리듬용).',
      table: { category: 'Layout' },
    },
  },
  // children 이 필수 prop 이라 기본값을 둔다.
  // 두지 않으면 render 로 직접 그리는 스토리가 args 누락으로 타입에서 막힌다.
  args: { children: null },
} satisfies Meta<typeof PageContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const Filler = ({ label }: { label: string }) => (
  <Card>
    <CardContent>
      <p className='text-sm text-text-subtle'>{label}</p>
    </CardContent>
  </Card>
);

/*
  네 단계를 한 화면에 쌓아 비교하지 않는다.
  바깥 래퍼가 `min-h-screen` 을 고정으로 갖고 있고 `className` 은 **안쪽** 래퍼로
  가기 때문에, 밖에서 높이를 줄일 방법이 없어 스크롤만 길어진다.
  대신 스토리를 단계별로 나눠 사이드바에서 전환하며 비교한다.
*/

/** 기본값 — 상세·폼 화면. 최대 4xl. */
export const Content: Story = {
  args: {
    width: 'content',
    className: 'space-y-4',
    children: (
      <>
        <Filler label='width=content · max-w-4xl — 책 상세, 폼' />
        <Filler label='className 은 이 안쪽 래퍼에 붙는다 (space-y-4)' />
      </>
    ),
  },
};

/** 단일 컬럼 — 피드·알림·검색·설정. 최대 3xl. */
export const Narrow: Story = {
  args: {
    width: 'narrow',
    className: 'space-y-4',
    children: (
      <>
        <Filler label='width=narrow · max-w-3xl — 피드, 알림, 검색, 설정' />
        <Filler label='한 줄이 길어지면 다음 줄 첫 글자를 찾기 어려워진다' />
      </>
    ),
  },
};

/** 데이터 그리드 — 대시보드·전체 도서. 최대 7xl. */
export const Wide: Story = {
  args: {
    width: 'wide',
    className: 'space-y-4',
    children: (
      <>
        <Filler label='width=wide · max-w-7xl — 대시보드, 전체 도서' />
        <Filler label='표·격자처럼 가로를 쓰는 화면에만' />
      </>
    ),
  },
};

/** 공개 서재 — 배경을 눌러 카드가 얹힌 면을 만든다. 최대 6xl. */
export const Library: Story = {
  args: {
    width: 'library',
    bg: 'sunken',
    className: 'space-y-4',
    children: (
      <>
        <Filler label='width=library · bg=sunken — 공개 서재' />
        <Filler label='배경이 한 단 낮아 카드가 떠 보인다' />
      </>
    ),
  },
};

/**
 * 실제 화면 한 조각 — 공개 서재.
 *
 * 눈여겨볼 것: `<main>` 이 없다(AppShellLayout 이 갖는다), 제목은 페이지가 `<h1>` 로
 * 직접 만든다, 세로 리듬(`space-y-8`)은 `className` 으로 주입한다, 목록은 `<ul>` 이다.
 */
export const RealWorld: Story = {
  args: {
    width: 'library',
    bg: 'sunken',
    className: 'space-y-8',
    children: (
      <>
        <header>
          <h1 className='heading-1 text-text-strong'>책벌레님의 책장</h1>
          <p className='mt-2 text-sm text-text-subtle'>
            완독 42권 · 읽는 중 3권
          </p>
        </header>

        <section aria-labelledby='recent-heading' className='space-y-3'>
          <h2 id='recent-heading' className='heading-2 text-text-strong'>
            최근에 읽은 책
          </h2>
          <ul className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {[
              { title: '아무튼, 계속', author: '김미소' },
              { title: '읽었습니다', author: '이다혜' },
              { title: '동물농장', author: '조지 오웰' },
              { title: '사피엔스', author: '유발 하라리' },
            ].map((book) => (
              <li key={book.title}>
                <Card className='py-4'>
                  <CardContent className='flex items-center gap-3 px-4'>
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
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </>
    ),
  },
};
