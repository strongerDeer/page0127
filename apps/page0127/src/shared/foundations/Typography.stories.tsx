import { TypeSpecimen } from './TypeSpecimen';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 타이포 스케일. **크기는 이 문서에 적혀 있지 않고 렌더된 값을 되읽는다** —
 * 툴바의 뷰포트를 바꾸면 숫자가 같이 움직인다(768px 에서 제목이 24 → 28 로 뛴다).
 *
 * 본문 서체는 **Pretendard**. `letter-spacing` 은 건드리지 않는다 — 자간이 이미
 * 최적화돼 있고, 밀리의서재도 전 요소 `normal` 이다.
 *
 * ## 제목은 클래스를 쓴다
 *
 * `text-2xl sm:text-3xl` 처럼 손으로 조합하지 말고 **`.heading-1` · `.heading-2`**
 * 유틸을 쓴다. 반응형 분기와 줄간격이 그 안에 들어 있고, 손으로 쓰면 화면마다 값이
 * 갈린다. 이 유틸은 `app/globals.css` 에 있고 24개 파일이 쓴다.
 *
 * 줄간격을 비율이 아니라 px 로 못 박은 이유: 비율(1.35)로 두면 28px 에서 37.8px 이
 * 나와 스펙(40)과 어긋나고 Figma Text Style 과도 값이 맞지 않는다.
 *
 * ## 크기 단계는 5개뿐이다
 *
 * 07 문서가 제안한 caption(13px)은 만들지 않았다 — 실사용이 0곳이고 12 와 14 사이에
 * 한 단을 더 끼우면 위계가 흐려진다. 단계를 늘리기 전에 **정말 새 단계가 필요한지**
 * 먼저 의심한다.
 *
 * ## 한글 줄간격
 *
 * Tailwind 기본 줄간격(14/20, 12/16)은 한글 다행 텍스트에 좁다. 크기는 그대로 두고
 * 줄간격만 넓혔다(14/22, 12/18). 클래스 이름이 안 바뀌므로 `text-sm`·`text-xs` 를
 * 쓰는 345곳을 손대지 않아도 된다.
 */
const meta = {
  title: 'Foundation/Typography',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 제목 2단 + 본문 3단. 창을 좁히면 제목 크기가 바뀐다. */
export const Scale: Story = {
  render: () => (
    <div className='p-6'>
      <TypeSpecimen
        className='heading-1'
        usage='페이지 제목'
        sample='책장을 보면, 그 사람이 보인다'
      />
      <TypeSpecimen
        className='heading-2'
        usage='섹션 제목'
        sample='이번 주 많이 읽은 책'
      />
      <TypeSpecimen
        className='text-base'
        usage='본문·책 제목'
        sample='아무튼, 계속'
      />
      <TypeSpecimen
        className='text-sm'
        usage='가장 많이 쓴다 (236곳)'
        sample='읽는 일에 대해 오래 생각해온 사람의 기록이다.'
      />
      <TypeSpecimen
        className='text-xs'
        usage='캡션·메타'
        sample='3일 전 · 완독 12명'
      />
    </div>
  ),
};

/**
 * 굵기는 **500 으로 통일**했다. 07 이 지켜지지 않은 게 아니라 07 이 현실과 안 맞아서
 * 코드 78곳을 기준으로 다시 정한 값이다. 제목(`.heading-*`)만 700 이다.
 */
export const Weight: Story = {
  render: () => (
    <div className='p-6'>
      <TypeSpecimen
        className='text-base font-normal'
        usage='기본 본문'
        sample='읽는 일에 대해 오래 생각해온 사람의 기록이다.'
      />
      <TypeSpecimen
        className='text-base font-medium'
        usage='강조 — 버튼·라벨·책 제목'
        sample='읽는 일에 대해 오래 생각해온 사람의 기록이다.'
      />
      <TypeSpecimen
        className='heading-2'
        usage='제목 (700)'
        sample='읽는 일에 대해 오래 생각해온 사람의 기록이다.'
      />
    </div>
  ),
};

/**
 * 위계는 크기가 아니라 **색**으로도 만든다. 같은 14px 이라도 무엇을 읽히고 싶은지에
 * 따라 색이 다르다 — 읽으라고 쓴 글을 흐리게 칠하지 않는다.
 */
export const Hierarchy: Story = {
  render: () => (
    <div className='max-w-md p-6'>
      <p className='heading-2 text-text-strong'>아무튼, 계속</p>
      <p className='mt-2 text-base text-text-body'>
        읽는 일에 대해 오래 생각해온 사람의 기록이다. 책을 좋아한다는 말로는
        부족한, 읽기라는 습관 그 자체에 대한 이야기.
      </p>
      <p className='mt-3 text-sm text-text-subtle'>김미소 · 코난북스</p>
      <p className='mt-1 text-xs text-text-subtle'>3일 전 · 완독 12명</p>
    </div>
  ),
};
