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
  description: string | null;
  pub_date: string | null;
  category: string | null;
  page_count: number | null;

  // 독서 상태
  status: BookStatus;

  // 날짜 정보
  start_date: string | null;
  completed_date: string | null;

  // 평가
  rating: BookRating | null;

  // 사용자 입력
  one_line_review: string | null;
  personal_memo: string | null;
  tags: string[] | null;

  // 메타 정보
  created_at: string;
  updated_at: string;
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
  description?: string;
  pub_date?: string;
  category?: string;
  page_count?: number;

  // 독서 상태
  status: BookStatus;

  // 날짜 정보
  start_date?: string;
  completed_date?: string;

  // 평가
  rating?: BookRating;

  // 사용자 입력
  one_line_review?: string;
  personal_memo?: string;
  tags?: string[];
};

/**
 * 통계 타입 re-export
 */
export type { BookStats } from './types/stats';
