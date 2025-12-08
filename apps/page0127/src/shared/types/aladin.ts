/**
 * 알라딘 API 관련 타입
 *
 * 학습 포인트:
 * - FSD 구조: shared 레이어는 entities를 import할 수 없음
 * - 외부 API 응답 타입은 shared에 정의
 */

export type AladinBook = {
  title: string;
  author: string;
  pubDate: string;
  description: string;
  isbn13: string;
  cover: string;
  publisher: string;
  categoryName: string;
  priceStandard: number;
  link: string;
  // 알라딘 API의 subInfo 객체 (쪽수 정보 포함)
  subInfo?: {
    itemPage?: number; // 책 쪽수
  };
};

export type AladinSearchResponse = {
  version: string;
  title: string;
  link: string;
  pubDate: string;
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  item: AladinBook[];
};
