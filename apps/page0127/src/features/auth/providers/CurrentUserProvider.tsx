'use client';

import { createContext, useContext } from 'react';

import { useCurrentUser } from '@/entities/user';

// useCurrentUser 훅의 반환 타입에서 data 부분만 추출
type CurrentUser = { id: string; email: string } | null | undefined;

type CurrentUserContextType = {
  currentUser: CurrentUser;
  isLoading: boolean;
};

// null 초기값: Provider 밖에서 사용하면 에러
const CurrentUserContext = createContext<CurrentUserContextType | null>(null);

// 커스텀 훅 — null 체크를 한 곳에서 처리
export const useCurrentUserContext = () => {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('CurrentUserProvider 밖에서 사용 불가');
  return ctx;
};

type CurrentUserProviderProps = {
  children: React.ReactNode;
};

// React Query의 useCurrentUser를 한 번만 호출해 트리 전체에 공급
// → 각 컴포넌트가 개별로 호출할 필요 없음, prop drilling 제거
export const CurrentUserProvider = ({ children }: CurrentUserProviderProps) => {
  const { data: currentUser, isLoading } = useCurrentUser();

  return (
    <CurrentUserContext.Provider value={{ currentUser, isLoading }}>
      {children}
    </CurrentUserContext.Provider>
  );
};
