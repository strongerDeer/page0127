import { Loader2 } from 'lucide-react';

import { cn } from '../lib/cn';

type SpinnerProps = {
  /** 무엇을 불러오는지. 스크린리더가 이것을 읽는다 */
  label: string;
  /** sm 20px · md 24px(기본) · lg 32px */
  size?: 'sm' | 'md' | 'lg';
  /** 감싸는 영역에 붙일 클래스. 가운데 정렬·여백은 여기서 */
  className?: string;
};

const SIZE = {
  sm: 'size-5',
  md: 'size-6',
  lg: 'size-8',
} as const;

/**
 * 영역이 채워지기를 기다리는 표시
 *
 * 학습 포인트:
 * - **`role='status'` 와 `label` 이 이 컴포넌트의 존재 이유다.** 돌아가는 아이콘은
 *   눈으로 보는 사람에게만 "기다리는 중"이고, 스크린리더 사용자는 화면이 비었는지
 *   고장 났는지 알 수 없다. 손으로 `Loader2` 를 놓던 5곳에는 전부 그게 없었다.
 * - 아이콘은 `aria-hidden` 이다. 읽을 것은 옆의 `sr-only` 문구 하나뿐이어야 한다.
 * - **크기가 3종으로 갈려 있었다**(h-4/h-6/h-8). 여기서 3단으로 못 박는다.
 *
 * 버튼 안에서 도는 로딩은 이걸 쓰지 않는다 — `Button` 의 `loading` 을 쓴다.
 * 버튼은 이미 자기 이름을 갖고 있어서 `role='status'` 를 또 두면 두 번 읽힌다.
 */
export const Spinner = ({ label, size = 'md', className }: SpinnerProps) => (
  <div
    role='status'
    aria-live='polite'
    className={cn('flex items-center justify-center', className)}
  >
    <Loader2
      aria-hidden
      className={cn('animate-spin text-text-subtle', SIZE[size])}
    />
    <span className='sr-only'>{label}</span>
  </div>
);
