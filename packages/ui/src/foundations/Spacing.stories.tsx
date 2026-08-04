'use client';

import { useRef } from 'react';

import { useMeasured } from './useMeasured';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 간격과 모서리.
 *
 * ## 간격은 Tailwind 기본 스케일을 쓴다
 *
 * 별도 토큰을 만들지 않았다. 4px 그리드가 이미 Tailwind 에 있고, 한 겹 더 씌우면
 * `space/4` 와 `p-4` 중 무엇을 쓸지 매번 고민하게 된다. Figma 쪽에만 같은 이름의
 * 변수를 둬서 디자인에서 임의값이 나오지 않게 막는다.
 *
 * ## 모서리는 하나에서 파생된다
 *
 * `--radius`(8px)가 기준이고 sm·md·lg·xl 은 여기서 `calc()` 로 갈라진다.
 * 카드 기준이 lg(=8px)이며, 값을 바꾸려면 `packages/design-tokens` 의 `radius` 하나만
 * 고치면 전부 따라 움직인다.
 *
 * ## 그림자는 쓰지 않는다
 *
 * 입체는 그림자가 아니라 **1px 선**으로 만든다(07 원칙 2). 실측 근거가 있다 —
 * 교보문고 홈이 그림자 2개에 1px 보더 139회, 밀리의서재가 그림자 4개였다.
 * 그래서 elevation 스케일 자체가 없다. 떠 있어야 하는 것(모달·드롭다운)에만 예외로 준다.
 */
const meta = {
  title: 'Foundation/Spacing & Corner',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/*
  클래스 이름을 문자열 보간(`w-${step}`)으로 만들면 안 된다 —
  Tailwind 는 소스를 훑어 쓰인 클래스만 생성하므로 조립된 이름은 찾지 못하고,
  스타일이 통째로 빠진 채 조용히 렌더된다. 그래서 전부 적어 둔다.
*/
const SPACE_STEPS = [
  { label: 'p-1', className: 'w-1' },
  { label: 'p-2', className: 'w-2' },
  { label: 'p-3', className: 'w-3' },
  { label: 'p-4', className: 'w-4' },
  { label: 'p-6', className: 'w-6' },
  { label: 'p-8', className: 'w-8' },
  { label: 'p-12', className: 'w-12' },
  { label: 'p-16', className: 'w-16' },
] as const;

const CORNER_STEPS = [
  { label: 'rounded-sm', className: 'rounded-sm' },
  { label: 'rounded-md', className: 'rounded-md' },
  { label: 'rounded-lg', className: 'rounded-lg' },
  { label: 'rounded-xl', className: 'rounded-xl' },
] as const;

const MEASURED_WIDTH = ['width'];
const MEASURED_RADIUS = ['border-top-left-radius'];

type StepProps = { label: string; className: string };

/** 막대 하나 — 실제 렌더된 너비를 되읽어 표시한다 */
const SpaceBar = ({ label, className }: StepProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const measured = useMeasured(ref, MEASURED_WIDTH);

  return (
    <div className='flex items-center gap-3 py-1.5'>
      <code className='w-20 shrink-0 text-xs text-text-strong'>{label}</code>
      <div ref={ref} className={`h-5 bg-primary ${className}`} />
      <span className='font-mono text-xs text-text-subtle'>
        {measured.width ?? '…'}
      </span>
    </div>
  );
};

/** 모서리 상자 — 실제 적용된 반경을 되읽는다 */
const CornerBox = ({ label, className }: StepProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const measured = useMeasured(ref, MEASURED_RADIUS);

  return (
    <div className='w-24'>
      <div
        ref={ref}
        className={`h-14 w-full border border-line bg-sunken ${className}`}
      />
      <code className='mt-2 block text-xs text-text-strong'>{label}</code>
      <span className='font-mono text-xs text-text-subtle'>
        {measured['border-top-left-radius'] ?? '…'}
      </span>
    </div>
  );
};

/** 4px 그리드. 번호가 곧 Tailwind 클래스다 (`4` = `p-4` = 16px). */
export const Space: Story = {
  render: () => (
    <div className='p-6'>
      {SPACE_STEPS.map((step) => (
        <SpaceBar key={step.label} {...step} />
      ))}
    </div>
  ),
};

/** 전부 `--radius` 하나에서 `calc()` 로 갈라진다. 카드 기준은 lg. */
export const Corner: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6'>
      {CORNER_STEPS.map((step) => (
        <CornerBox key={step.label} {...step} />
      ))}
    </div>
  ),
};

/**
 * 책 표지는 스케일 밖의 **도메인 셰이프**다. 왼쪽이 책등이라 각지고 오른쪽만 둥글다
 * (`2px 6px 6px 2px`). Figma 변수는 비대칭 radius 를 담지 못해 값을 직접 넣었다.
 *
 * ⚠️ 이 `.book-cover` CSS 는 `@layer` 밖에 있어 **모든 Tailwind 유틸을 이긴다.**
 * `rounded-md` 나 `bg-sunken` 으로 덮으려는 시도는 조용히 실패한다.
 */
export const BookCoverShape: Story = {
  render: () => (
    <div className='flex items-end gap-6 p-6'>
      <div className='book-cover h-32 w-24 border border-line-soft' />
      <div className='max-w-sm text-sm text-text-subtle'>
        표지 이미지가 없을 때 보이는 대체 조판. 그림자로 띄우지 않는다 — 교보는
        표지 그림자가 <code>16px 16px 16px 0</code>, 밀리는 표지 254개에 그림자
        0이었다. 책등 음영은 왼쪽 8px 구간의 그라디언트로 만든다.
      </div>
    </div>
  ),
};
