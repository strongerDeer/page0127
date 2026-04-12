'use client';

import { createContext, useContext } from 'react';

import type { BookStatus } from '@/entities/book/types';

// 탭이 가질 수 있는 값 타입
type StatusValue = BookStatus | 'all';

// Context 타입: 현재 활성 탭 값 + 변경 핸들러
type StatusTabFilterContextType = {
  activeValue: StatusValue;
  onChange: (value: StatusValue) => void;
  isPending?: boolean;
};

// Context 생성 — null 초기값: Provider 밖에서 사용하면 에러
const StatusTabFilterContext =
  createContext<StatusTabFilterContextType | null>(null);

// Context를 쓰는 커스텀 훅 — null 체크 한 곳에서 처리
const useStatusTabFilter = () => {
  const ctx = useContext(StatusTabFilterContext);
  if (!ctx) throw new Error('StatusTabFilter.Tab은 StatusTabFilter 안에서만 사용 가능');
  return ctx;
};

// ─── 부모 컴포넌트 ───────────────────────────────────────────────

type StatusTabFilterProps = {
  /** 현재 선택된 탭 값 (controlled: 부모가 상태를 가짐) */
  value: StatusValue;
  /** 탭 변경 핸들러 */
  onChange: (value: StatusValue) => void;
  /** transition 중 탭 전체를 흐리게 (useTransition 연동) */
  isPending?: boolean;
  children: React.ReactNode;
};

export const StatusTabFilter = ({
  value,
  onChange,
  isPending,
  children,
}: StatusTabFilterProps) => {
  return (
    // Context.Provider로 value/onChange를 자식 전체에 공급
    <StatusTabFilterContext.Provider value={{ activeValue: value, onChange, isPending }}>
      <div
        className='mb-6 flex flex-wrap gap-2'
        style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}
      >
        {children}
      </div>
    </StatusTabFilterContext.Provider>
  );
};

// ─── 서브 컴포넌트 ────────────────────────────────────────────────

type TabProps = {
  value: StatusValue;
  children: React.ReactNode;
};

// 개별 탭 버튼 — Context에서 activeValue 꺼내 활성 여부 판단
const Tab = ({ value, children }: TabProps) => {
  const { activeValue, onChange } = useStatusTabFilter();
  const isActive = activeValue === value;

  return (
    <button
      onClick={() => onChange(value)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
};

// 서브 컴포넌트를 프로퍼티로 붙여 네임스페이스 형성
// → <StatusTabFilter.Tab> 형태로 사용 가능
StatusTabFilter.Tab = Tab;
