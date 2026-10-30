'use client';

import type { ReactNode } from 'react';

type SelectionBarProps = {
  /** 그룹의 읽어 주는 이름 (예: '서재 일괄 관리') */
  label: string;
  /** 모두 선택 체크박스 옆 문구 */
  toggleAllLabel: string;
  /** 선택 개수 문구 (예: '3개 기록 선택') */
  countLabel: string;
  selectedCount: number;
  /** 모두 선택으로 고를 수 있는 개수 — 이만큼 고르면 체크, 일부면 반쯤 체크 */
  selectableCount: number;
  onToggleAll: () => void;
  toggleAllDisabled?: boolean;
  /** 오른쪽 동작 버튼들 */
  children: ReactNode;
  /** 바 아래 작은 안내 */
  hint?: ReactNode;
};

/**
 * 목록에서 여러 개를 고른 뒤 한 번에 처리하는 바.
 * 왼쪽은 "무엇을 골랐나", 오른쪽은 "무엇을 할까"로 나눠 선택 → 동작 순서로 읽히게 한다.
 * 모두 선택은 버튼 두 개(모두 선택·선택 해제) 대신 체크박스 하나로 켜고 끈다.
 * 스크롤해 내려가며 고른 뒤 바로 누를 수 있게 GNB(h-16) 아래에 붙는다.
 */
export const SelectionBar = ({
  label,
  toggleAllLabel,
  countLabel,
  selectedCount,
  selectableCount,
  onToggleAll,
  toggleAllDisabled,
  children,
  hint,
}: SelectionBarProps) => {
  const allSelected = selectableCount > 0 && selectedCount >= selectableCount;
  const someSelected = selectedCount > 0 && !allSelected;
  return (
    <div
      role='group'
      aria-label={label}
      className='sticky top-16 z-30 rounded-xl border border-line-soft bg-card p-3 sm:px-4'
    >
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
        <div className='flex items-center gap-3'>
          <label className='flex cursor-pointer items-center gap-2 text-sm text-text-body has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50'>
            <input
              type='checkbox'
              className='size-4 shrink-0 accent-primary'
              checked={allSelected}
              ref={(input) => {
                // 일부만 고른 상태는 checked 로 표현할 수 없어 DOM 속성으로 둔다
                if (input) input.indeterminate = someSelected;
              }}
              disabled={toggleAllDisabled || !selectableCount}
              onChange={onToggleAll}
            />
            {toggleAllLabel}
          </label>
          <span
            role='status'
            className={`ml-auto text-sm font-medium sm:ml-0 ${selectedCount ? 'text-primary' : 'text-text-subtle'}`}
          >
            {countLabel}
          </span>
        </div>
        <div className='flex items-center gap-1.5 border-t border-line-soft pt-2 sm:ml-auto sm:border-0 sm:pt-0'>
          {children}
        </div>
      </div>
      {hint && <p className='mt-2 text-xs text-text-subtle'>{hint}</p>}
    </div>
  );
};

/** 되돌릴 수 없는 동작(삭제)을 다른 버튼과 떨어뜨리는 세로 구분선 */
export const SelectionBarDivider = () => (
  <span aria-hidden className='mx-1 h-5 w-px shrink-0 bg-line' />
);
