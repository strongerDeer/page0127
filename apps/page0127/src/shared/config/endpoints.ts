/**
 * API 엔드포인트 중앙 관리
 *
 * 학습 포인트:
 * - as const: TypeScript에서 읽기 전용 리터럴 타입으로 추론
 * - 함수형 엔드포인트: 동적 파라미터(id 등)를 받는 엔드포인트
 * - 중앙 관리로 URL 변경 시 한 곳만 수정
 */
export const API_ENDPOINTS = {
  books: {
    create: '/books',
    list: '/books',
    detail: (id: string) => `/books/${id}`,
    update: (id: string) => `/books/${id}`,
    delete: (id: string) => `/books/${id}`,
    stats: '/books/stats', // 통계 조회
    like: '/books/like', // 책 좋아요 토글
    activities: (id: string) => `/books/${id}/activities`, // GET: 책별 활동 타임라인
    comments: (bookId: string) => `/books/${bookId}/comments`, // GET/POST: 댓글 목록/작성
    commentDetail: (bookId: string, commentId: string) =>
      `/books/${bookId}/comments/${commentId}`, // PATCH/DELETE: 댓글 수정/삭제
    stream: (bookId: string) => `/books/${bookId}/stream`, // GET: 활동+댓글 병합 스트림
    likes: (bookId: string) => `/books/${bookId}/likes`, // POST/DELETE: 개인 책 좋아요
    threadRead: (bookId: string) => `/books/${bookId}/thread-read`, // POST: 열람 시각 기록
  },
  globalBooks: {
    comments: (id: string) => `/global-books/${id}/comments`, // GET/POST: 전역 책 스레드
    commentDetail: (id: string, commentId: string) =>
      `/global-books/${id}/comments/${commentId}`, // PATCH/DELETE
  },
  follows: {
    follow: '/follows', // POST: 팔로우하기
    unfollow: (userId: string) => `/follows/${userId}`, // DELETE: 언팔로우하기
    followers: (userId: string) => `/follows/${userId}/followers`, // GET: 팔로워 목록
    following: (userId: string) => `/follows/${userId}/following`, // GET: 팔로잉 목록
    stats: (userId: string) => `/follows/${userId}/stats`, // GET: 팔로우 통계
    isFollowing: (userId: string) => `/follows/${userId}/is-following`, // GET: 팔로우 여부 확인
  },
  users: {
    search: '/users/search', // GET: 사용자 검색
  },
  feed: {
    list: '/feed', // GET: 활동 피드 조회
  },
} as const;
