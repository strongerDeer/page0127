import type { ReactNode } from 'react';

/**
 * 패널 오른쪽 위 빨간 "예시" 표시 — 캡처를 한 칸만 잘라 가도 실제 숫자가 아니라는 게 보이게 한다.
 * (HJ 2026-11-26: "예시 데이터 빨갛게 시각적으로 잘 보이게")
 */
export const DemoDataChip = () => (
  <span className='pointer-events-none absolute -top-2.5 right-2 z-10 rounded border border-red-600 bg-red-50 px-1.5 text-[11px] font-bold leading-5 text-red-600 shadow-sm dark:border-red-400 dark:bg-red-950 dark:text-red-300'>
    예시 데이터
  </span>
);

/** 실제 어드민 패널을 감싸 "예시" 표시를 붙인다. 패널 자체는 고치지 않는다 */
export const DemoPanel = ({ children }: { children: ReactNode }) => (
  <div className='relative'>
    <DemoDataChip />
    {children}
  </div>
);
