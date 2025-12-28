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
