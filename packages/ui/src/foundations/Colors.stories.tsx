import { Swatch, SwatchRow } from './Swatch';
import { darkOverrides, pick, primitiveGroups } from './tokens';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 색 팔레트. **값은 `packages/design-tokens/dist/*.css` 를 그 자리에서 파싱해 그린다** —
 * 이 문서에 색을 손으로 적어 둔 곳은 없으므로, 토큰을 고치고 빌드하면 여기도 같이 바뀐다.
 *
 * 스와치를 클릭하면 `var(--이름)` 이 복사된다. 코드에 그대로 붙일 수 있는 형태다.
 *
 * ## 2층 구조
 *
 * - **Primitives** — 화면에 직접 쓰지 않는다. Semantic 이 참조할 "물감"이다.
 * - **Semantic** — 컴포넌트는 이것만 쓴다. 전부 Primitives 를 참조(alias)하므로
 *   원색을 바꾸면 함께 움직인다. 스와치의 `→` 표시가 그 참조다.
 *
 * ## 색을 고르는 원칙 (07 문서)
 *
 * 1. 무채(네이비 잉크)가 지배한다. 유채색은 장식이 아니라 **직무**다 —
 *    `primary`=브랜드·주 CTA·링크, `rank-up`=순위 상승, `destructive`=삭제·탈퇴.
 * 2. 입체는 그림자가 아니라 **1px 선**으로 만든다 (`line` · `line-soft`).
 * 3. 본문을 흐리게 칠하지 않는다. 읽으라고 쓴 글은 `text-strong` · `text-body`.
 *
 * ## 명암비
 *
 * 텍스트·액션 토큰에는 **흰 배경 기준 WCAG 명암비와 등급**을 함께 표시한다.
 * 눈으로만 고르면 기준을 못 넘긴 걸 알아채지 못한다 — 실제로 `text/subtle` 이
 * 4.496 으로 AA(4.5)에 0.004 모자란 채 쓰이고 있었다.
 * `AA Large` 는 18.66px+bold 또는 24px 이상에서만 통과라는 뜻이라 **본문에는 미달**이다.
 */
const meta = {
  title: 'Foundation/Colors',
  parameters: {
    layout: 'fullscreen',
    // 팔레트는 색 자체가 내용이라 대비 검사를 걸면 스와치 전부가 위반으로 잡힌다.
    a11y: { disable: true },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const WHITE = '#ffffff';

/** 화면에 직접 쓰지 않는 원색. Semantic 이 참조할 물감이다. */
export const Primitives: Story = {
  render: () => (
    <div className='p-6'>
      {primitiveGroups.map((group) => (
        <SwatchRow key={group.family} title={group.family}>
          {group.tokens.map((token) => (
            <Swatch key={token.name} token={token} />
          ))}
        </SwatchRow>
      ))}
    </div>
  ),
};

/**
 * 컴포넌트가 실제로 쓰는 토큰.
 *
 * **명암비는 잴 뜻이 있는 곳에만 붙였다.** 면·경계·차트 토큰에까지 텍스트 기준(4.5)을
 * 들이대면 화면이 빨간 배지로 덮여 진짜 문제가 묻힌다. 전경색은 각자가 실제로 얹히는
 * 배경 위에서 쟀다 — `primary-foreground` 를 흰 배경에서 재면 1.00 이 나오지만
 * 그건 아무 뜻도 없는 숫자다.
 */
export const Semantic: Story = {
  render: () => (
    <div className='p-6'>
      <SwatchRow
        title='텍스트 위계 — 3단'
        description='흰 배경(background) 기준. 전부 AA(4.5) 이상이다. 한때 네 번째 단계 faint(2.50)가 있었으나 없앴다 — 4.5 를 넘기려면 subtle 과 육안 구분이 안 되는 값이 되어, 4단계가 흰 배경에서 애초에 성립하지 않았다.'
      >
        {pick('--text-strong', '--text-body', '--text-subtle').map((token) => (
          <Swatch key={token.name} token={token} contrastAgainst={WHITE} />
        ))}
      </SwatchRow>

      <SwatchRow
        title='직무색'
        description='유채색은 장식이 아니라 직무다. 흰 배경 기준 — 링크·아이콘 등 전경으로도 쓰이므로 텍스트 기준으로 잰다.'
      >
        {pick('--primary', '--rank-up', '--destructive').map((token) => (
          <Swatch key={token.name} token={token} contrastAgainst={WHITE} />
        ))}
      </SwatchRow>

      <SwatchRow
        title='전경 — 각자의 배경 위에서 잰 값'
        description='primary-foreground 는 primary 위, accent-foreground 는 accent 위… 실제로 얹히는 짝 위에서 재야 뜻이 있는 숫자가 나온다.'
      >
        <Swatch
          token={pick('--primary-foreground')[0]}
          contrastAgainst={pick('--primary')[0].value}
        />
        <Swatch
          token={pick('--accent-foreground')[0]}
          contrastAgainst={pick('--accent')[0].value}
        />
        <Swatch
          token={pick('--secondary-foreground')[0]}
          contrastAgainst={pick('--secondary')[0].value}
        />
        <Swatch
          token={pick('--muted-foreground')[0]}
          contrastAgainst={pick('--muted')[0].value}
        />
        <Swatch
          token={pick('--card-foreground')[0]}
          contrastAgainst={pick('--card')[0].value}
        />
      </SwatchRow>

      <SwatchRow
        title='면'
        description='배경으로만 쓰이므로 명암비를 재지 않는다. secondary·muted 는 sunken 과 같은 값이다 — 과거 따로 있었으나 육안 구분이 안 되는 밝기 차라 통합했다.'
      >
        {pick(
          '--background',
          '--card',
          '--popover',
          '--sunken',
          '--secondary',
          '--muted',
          '--accent',
          '--overlay'
        ).map((token) => (
          <Swatch key={token.name} token={token} />
        ))}
      </SwatchRow>

      <SwatchRow
        title='경계'
        description='입체는 그림자가 아니라 1px 선으로 만든다 (07 원칙 2). border·input 은 line 의 별칭이다.'
      >
        {pick('--line', '--line-soft', '--border', '--input', '--ring').map(
          (token) => (
            <Swatch key={token.name} token={token} />
          )
        )}
      </SwatchRow>

      <SwatchRow
        title='차트'
        description='카테고리를 구분하는 용도라 서로 구별되는 것이 기준이다. 텍스트 명암비 대상이 아니다.'
      >
        {pick(
          '--chart-1',
          '--chart-2',
          '--chart-3',
          '--chart-4',
          '--chart-5',
          '--chart-6',
          '--chart-7'
        ).map((token) => (
          <Swatch key={token.name} token={token} />
        ))}
      </SwatchRow>

      <SwatchRow
        title='사이드바'
        description='어드민 레이아웃 전용. 대부분 본체 토큰과 같은 값을 참조한다.'
      >
        {pick(
          '--sidebar',
          '--sidebar-foreground',
          '--sidebar-primary',
          '--sidebar-primary-foreground',
          '--sidebar-accent',
          '--sidebar-accent-foreground',
          '--sidebar-border',
          '--sidebar-ring'
        ).map((token) => (
          <Swatch key={token.name} token={token} />
        ))}
      </SwatchRow>
    </div>
  ),
};

/**
 * 다크에서 값이 덮어써지는 토큰만. 여기 없는 토큰은 라이트 값을 그대로 쓴다.
 *
 * 명암비는 다크 배경(`navy/900`) 기준이다. 라이트에서 쓰던 색을 그대로 못 쓰는 경우가
 * 많아 별도 원색이 필요했다 — `blue/600` 은 다크 배경 위 2.70 이라 primary 로 쓸 수 없다.
 */
export const Dark: Story = {
  parameters: { backgrounds: { disable: true } },
  render: () => (
    <div className='p-6' style={{ backgroundColor: '#14294e' }}>
      <SwatchRow
        title='다크 오버라이드'
        description='명암비는 다크 배경(navy/900 #14294e) 기준.'
      >
        {darkOverrides.map((token) => (
          <Swatch key={token.name} token={token} contrastAgainst='#14294e' />
        ))}
      </SwatchRow>
    </div>
  ),
};
