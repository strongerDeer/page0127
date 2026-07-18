'use client';

import { useMemo, useReducer } from 'react';

import type { BookStatus } from '@/entities/book';

/**
 * 서재 필터 상태 훅
 *
 * 내 서재(DashboardContent)는 useReducer, 공개 서재(PublicLibraryContent)는
 * useState 5개로 같은 필터 셋을 각자 관리하고 있었다 — 한쪽만 고치면
 * 동작이 어긋나는 구조라 여기로 통합한다.
 *
 * 학습 포인트:
 * - 5개 필터는 논리적으로 한 그룹 → useReducer + RESET_ALL 한 번으로 전체 초기화
 * - 초기값 상수를 RESET_ALL이 재사용해 "진짜 초기 상태"로 복귀
 * - 액션 함수들은 useMemo로 참조를 고정한다 — 소비처(BookSearchInput 등)의
 *   useEffect deps에 들어가므로 매 렌더 새 참조면 effect가 불필요하게 재실행된다
 */
export type LibraryFilterState = {
  selectedMonth: number | null;
  selectedCategories: string[];
  selectedRating: number | null;
  searchQuery: string;
  // DashboardBookList 내부 useState로 두면 RESET_ALL이 닿지 않음 → 부모(훅)로 lift
  statusFilter: BookStatus | 'all';
};

type FilterAction =
  | { type: 'TOGGLE_MONTH'; month: number }
  | { type: 'CLEAR_MONTH' }
  | { type: 'TOGGLE_RATING'; rating: number }
  | { type: 'CLEAR_RATING' }
  | { type: 'SET_CATEGORIES'; categories: string[] }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_STATUS'; status: BookStatus | 'all' }
  | { type: 'RESET_ALL' };

const INITIAL_FILTER_STATE: LibraryFilterState = {
  selectedMonth: null,
  selectedCategories: [],
  selectedRating: null,
  searchQuery: '',
  statusFilter: 'all',
};

const filterReducer = (
  state: LibraryFilterState,
  action: FilterAction
): LibraryFilterState => {
  switch (action.type) {
    case 'TOGGLE_MONTH':
      return {
        ...state,
        selectedMonth:
          state.selectedMonth === action.month ? null : action.month,
      };
    case 'CLEAR_MONTH':
      return { ...state, selectedMonth: null };
    case 'TOGGLE_RATING':
      return {
        ...state,
        selectedRating:
          state.selectedRating === action.rating ? null : action.rating,
      };
    case 'CLEAR_RATING':
      return { ...state, selectedRating: null };
    case 'SET_CATEGORIES':
      return { ...state, selectedCategories: action.categories };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'SET_STATUS':
      return { ...state, statusFilter: action.status };
    case 'RESET_ALL':
      return INITIAL_FILTER_STATE;
    default:
      return state;
  }
};

export const useLibraryFilters = () => {
  const [state, dispatch] = useReducer(filterReducer, INITIAL_FILTER_STATE);

  // dispatch는 참조가 고정이므로 액션 묶음도 한 번만 만들어진다
  const actions = useMemo(
    () => ({
      toggleMonth: (month: number) => dispatch({ type: 'TOGGLE_MONTH', month }),
      clearMonth: () => dispatch({ type: 'CLEAR_MONTH' }),
      toggleRating: (rating: number) =>
        dispatch({ type: 'TOGGLE_RATING', rating }),
      clearRating: () => dispatch({ type: 'CLEAR_RATING' }),
      setCategories: (categories: string[]) =>
        dispatch({ type: 'SET_CATEGORIES', categories }),
      setSearch: (query: string) => dispatch({ type: 'SET_SEARCH', query }),
      setStatus: (status: BookStatus | 'all') =>
        dispatch({ type: 'SET_STATUS', status }),
      resetAll: () => dispatch({ type: 'RESET_ALL' }),
    }),
    []
  );

  return { ...state, ...actions };
};
