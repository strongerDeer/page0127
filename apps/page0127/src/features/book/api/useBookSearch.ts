'use client';

import { useCallback, useReducer, useRef } from 'react';

import { searchBooks } from '@/shared/api/aladin';

import type { AladinBook } from '@/entities/book';

// ─── State 타입 정의 ───────────────────────────────────────────────
// 검색과 관련된 모든 상태를 하나의 객체로 관리
// useReducer를 쓰는 핵심 이유:
//   search() 호출 한 번에 6개 상태가 동시에 바뀜
//   → useState 6개라면 렌더링이 여러 번 트리거될 수 있음
//   → reducer로 묶으면 dispatch 한 번에 원자적(atomic)으로 갱신
type SearchState = {
  books: AladinBook[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalResults: number;
  currentQuery: string;
};

// ─── Action 타입 정의 ──────────────────────────────────────────────
// 어떤 "사건"이 발생했는지 명시적으로 표현
// SEARCH_START  → 검색 시작 (loading ON, 이전 에러 초기화)
// SEARCH_SUCCESS → 검색 성공 (결과 저장, loading OFF)
// SEARCH_ERROR  → 검색 실패 (에러 저장, loading OFF)
// SEARCH_CLEAR  → 입력 비움 (초기화)
type SearchAction =
  | { type: 'SEARCH_START'; query: string; page: number }
  | { type: 'SEARCH_SUCCESS'; books: AladinBook[]; totalResults: number }
  | { type: 'SEARCH_ERROR' }
  | { type: 'SEARCH_CLEAR' };

// ─── 초기 상태 ────────────────────────────────────────────────────
const initialState: SearchState = {
  books: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  totalResults: 0,
  currentQuery: '',
};

// ─── Reducer 함수 ─────────────────────────────────────────────────
// (현재 상태, 액션) → 다음 상태
// switch로 액션 종류별 상태 변화를 명확하게 표현
function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SEARCH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        currentQuery: action.query,
        currentPage: action.page,
      };
    case 'SEARCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        books: action.books,
        totalResults: action.totalResults,
      };
    case 'SEARCH_ERROR':
      return {
        ...state,
        isLoading: false,
        error: '도서 검색 중 오류가 발생했습니다.',
      };
    case 'SEARCH_CLEAR':
      // 초기 상태로 완전 리셋
      return initialState;
    default:
      return state;
  }
}

/**
 * 도서 검색 Custom Hook
 *
 * 학습 포인트:
 * - useReducer로 비동기 요청 상태(loading/error/data) 관리
 * - 6개의 useState → 1개의 useReducer로 원자적 상태 갱신
 * - 각 액션(SEARCH_START/SUCCESS/ERROR)이 상태 전환을 명확하게 표현
 */
export const useBookSearch = () => {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const ITEMS_PER_PAGE = 10;

  // 마지막으로 시작한 요청의 번호. 입력창을 검색 중에도 열어두면서
  // (disabled 를 걸면 브라우저가 포커스를 뺏는다 — BookSearchInput 주석 참조)
  // 요청이 여러 개 겹칠 수 있게 됐다. 먼저 보낸 요청이 늦게 도착하면
  // 최신 검색어의 결과를 덮어써 버리므로, 마지막 요청의 응답만 반영한다.
  const requestIdRef = useRef(0);

  // useCallback으로 함수를 메모이제이션 → 매 렌더마다 새 함수가 생기는 것을 방지
  // (BookSearchInput의 useEffect가 onSearch를 의존성으로 참조하는데,
  //  참조가 매번 바뀌면 effect가 계속 재실행 → 무한 루프로 이어짐)
  const search = useCallback(async (query: string, page = 1) => {
    if (!query.trim()) {
      requestIdRef.current += 1; // 진행 중인 응답이 초기화를 되돌리지 못하게 한다
      dispatch({ type: 'SEARCH_CLEAR' });
      return;
    }

    const requestId = (requestIdRef.current += 1);

    // 검색 시작: loading ON, 쿼리/페이지 저장
    dispatch({ type: 'SEARCH_START', query, page });

    try {
      const response = await searchBooks(query, {
        page,
        maxResults: ITEMS_PER_PAGE,
      });
      if (requestId !== requestIdRef.current) return; // 뒤늦게 온 옛 응답 — 버린다
      const items = response.item || [];

      // 검색 성공: 결과 저장, loading OFF
      dispatch({
        type: 'SEARCH_SUCCESS',
        books: items,
        totalResults: response.totalResults,
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      // 검색 실패: 에러 저장, loading OFF
      dispatch({ type: 'SEARCH_ERROR' });
      console.error(err);
    }
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      if (state.currentQuery) {
        search(state.currentQuery, page);
      }
    },
    [state.currentQuery, search]
  );

  // state를 풀어서 반환 → 기존 사용처(BookSearchInput 등) 변경 없음
  return {
    books: state.books,
    isLoading: state.isLoading,
    error: state.error,
    currentPage: state.currentPage,
    totalResults: state.totalResults,
    itemsPerPage: ITEMS_PER_PAGE,
    search,
    goToPage,
  };
};
