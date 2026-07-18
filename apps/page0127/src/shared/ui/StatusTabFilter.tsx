'use client';

import { createContext, useContext } from 'react';

// FSD: shared 레이어는 도메인을 몰라야 한다
// → BookStatus(=entities/book) import를 제거하고 string으로 일반화
// 사용처(features/stats)가 value에 의미를 부여한다
type StatusTabFilterContextType = {
  activeValue: string;
  onChange: (value: string) => void;
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
  value: string;
  /** 탭 변경 핸들러 */
  onChange: (value: string) => void;
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
    // React 19: <Context>를 그대로 Provider로 사용 (.Provider 생략)
    <StatusTabFilterContext value={{ activeValue: value, onChange, isPending }}>
      {/* 바깥 여백은 사용처(레이아웃)의 책임 — 컴포넌트가 mb를 갖지 않는다 */}
      <div
        className='flex flex-wrap gap-1.5'
        style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}
      >
        {children}
      </div>
    </StatusTabFilterContext>
  );
};

// ─── 서브 컴포넌트 ────────────────────────────────────────────────

type TabProps = {
  value: string;
  children: React.ReactNode;
};

// 개별 탭 버튼 — Context에서 activeValue 꺼내 활성 여부 판단
const Tab = ({ value, children }: TabProps) => {
  const { activeValue, onChange } = useStatusTabFilter();
  const isActive = activeValue === value;

  return (
    // 색은 토큰만 쓴다 — 하드코딩(bg-emerald-600)은 팔레트 교체에서 누락된다
    <button
      onClick={() => onChange(value)}
      aria-pressed={isActive}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-line bg-card text-text-body hover:border-text-faint hover:bg-sunken'
      }`}
    >
      {children}
    </button>
  );
};

// 서브 컴포넌트를 프로퍼티로 붙여 네임스페이스 형성
// → <StatusTabFilter.Tab> 형태로 사용 가능
StatusTabFilter.Tab = Tab;
