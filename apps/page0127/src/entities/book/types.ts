/**
 * 알라딘 API 타입 re-export
 *
 * 학습 포인트:
 * - FSD에서 entities는 shared를 import 가능
 * - 외부 API 타입은 shared에 정의하고, entities에서 re-export
 * - 타입 중복 방지
 */
export type { AladinBook, AladinSearchResponse } from '@/shared/types/aladin';

/**
 * 도서 독서 상태
 */
export type BookStatus = 'want_to_read' | 'reading' | 'completed';

/**
 * 도서 평가 점수
 */
export type BookRating = 0 | 1 | 2 | 3 | 4 | 5 | 10;

/**
 * Supabase books 테이블 타입
 */
export type Book = {
  id: string;
  user_id: string;

  // 알라딘 API 데이터
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image: string | null;
  spine_image: string | null; // 책등 이미지 (책장 UI용)
  description: string | null;
  pub_date: string | null;
  category: string | null;
  page_count: number | null;

  // AI 분석용 추가 데이터
  toc: string | null; // 목차 (Table of Contents)

  // 독서 상태
  status: BookStatus;
  read_count: number; // 재독 횟수 (1: 첫 독서, 2: 2회독...)

  // 날짜 정보
  start_date: string | null;
  completed_date: string | null;

  // 평가
  rating: BookRating | null;

  // 사용자 입력
  one_line_review: string | null;
  personal_memo: string | null;
  tags: string[] | null;

  // 공개 설정
  is_public: boolean;

  // 메타 정보
  created_at: string;
  updated_at: string;
};

/**
 * Global Book (공용 도서 데이터)
 */
export type GlobalBook = {
  id: string;
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image: string | null;
  description: string | null;
  pub_date: string | null;
  category: string | null;
  spine_image: string | null;
  created_at: string;
};

/**
 * 도서 랭킹 데이터
 *
 * 순위 변동 필드는 book_ranking_snapshots(전일 스냅샷)와 대조해 서버가 계산한다.
 * 스냅샷이 아직 하루도 쌓이지 않았다면 has_history=false —
 * 이때는 UI가 아무 뱃지도 그리지 않는다. (없는 이력을 NEW로 칠하면 거짓말이 된다)
 */
export type BookRanking = {
  isbn: string;
  count: number;
  book_info: GlobalBook;
  /** 현재 순위 (1부터) */
  rank?: number;
  /** 양수면 상승(▲), 음수면 하락(▼), 0이면 유지(-). 신규·이력없음이면 null */
  rank_delta?: number | null;
  /** 직전 스냅샷에 없던 책 */
  is_new?: boolean;
  /** 비교할 과거 스냅샷이 존재하는가 */
  has_history?: boolean;
};

/**
 * 도서 등록/수정 시 사용하는 타입
 */
export type BookInput = {
  // 알라딘 API 데이터
  isbn: string;
  title: string;
  author?: string;
  publisher?: string;
  cover_image?: string;
  spine_image?: string | null; // 책등 이미지 (책장 UI용) — null로 명시적으로 지울 수 있다
  description?: string;
  pub_date?: string;
  category?: string;
  page_count?: number;

  // AI 분석용 추가 데이터
  toc?: string;

  // 독서 상태
  status: BookStatus;
  read_count?: number; // 재독 횟수 (기본값 1)

  // 날짜 정보
  start_date?: string;
  completed_date?: string;

  // 평가
  rating?: BookRating;

  // 사용자 입력
  one_line_review?: string;
  personal_memo?: string;
  tags?: string[];

  // 공개 설정
  is_public?: boolean;
};

/**
 * 통계 타입 re-export
 */
export type { BookStats } from './types/stats';
