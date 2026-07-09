/**
 * API 엔드포인트 중앙 관리
 *
 * 학습 포인트:
 * - 모든 API 경로를 한 곳에서 관리하여 변경 용이
 * - 타입 안전성을 위해 함수로 구현 (동적 파라미터 처리)
 * - base URL은 환경변수나 설정에서 관리 가능
 */

const API_BASE = '/api';

/**
 * 인증 관련 엔드포인트
 */
export const authEndpoints = {
  me: `${API_BASE}/auth/me`,
  account: `${API_BASE}/auth/account`,
} as const;

/**
 * 도서 관련 엔드포인트
 */
export const bookEndpoints = {
  // 목록/생성
  list: `${API_BASE}/books`,
  // 상세/수정/삭제
  detail: (id: string) => `${API_BASE}/books/${id}`,
  // 검색
  search: `${API_BASE}/books/search`,
  // 상세 정보
  bookDetail: `${API_BASE}/books/detail`,
  // 통계
  stats: `${API_BASE}/books/stats`,
  // 캘린더
  calendar: `${API_BASE}/books/calendar`,
} as const;

/**
 * 활동(피드) 관련 엔드포인트
 */
export const activityEndpoints = {
  // 피드 목록
  feed: `${API_BASE}/feed`,
  // 활동 상세/수정/삭제
  detail: (id: string) => `${API_BASE}/activities/${id}`,
  // 댓글
  comments: (activityId: string) => `${API_BASE}/activities/${activityId}/comments`,
  comment: (activityId: string, commentId: string) =>
    `${API_BASE}/activities/${activityId}/comments/${commentId}`,
  // 좋아요
  likes: (activityId: string) => `${API_BASE}/activities/${activityId}/likes`,
} as const;

/**
 * 팔로우 관련 엔드포인트
 */
export const followEndpoints = {
  // 팔로우/언팔로우
  follow: `${API_BASE}/follows`,
  // 특정 유저 팔로우/언팔로우
  userFollow: (userId: string) => `${API_BASE}/follows/${userId}`,
  // 팔로우 여부 확인
  isFollowing: (userId: string) => `${API_BASE}/follows/${userId}/is-following`,
  // 팔로워 목록
  followers: (userId: string) => `${API_BASE}/follows/${userId}/followers`,
  // 팔로잉 목록
  following: (userId: string) => `${API_BASE}/follows/${userId}/following`,
  // 팔로우 통계
  stats: (userId: string) => `${API_BASE}/follows/${userId}/stats`,
} as const;

/**
 * 알림 관련 엔드포인트
 */
export const notificationEndpoints = {
  // 알림 목록
  list: `${API_BASE}/notifications`,
  // 알림 상세/삭제
  detail: (notificationId: string) => `${API_BASE}/notifications/${notificationId}`,
  // 읽음 처리
  read: (notificationId: string) => `${API_BASE}/notifications/${notificationId}/read`,
  // 전체 읽음 처리
  readAll: `${API_BASE}/notifications/read-all`,
  // 읽지 않은 알림 개수
  unreadCount: `${API_BASE}/notifications/unread-count`,
  // 알림 정리
  cleanup: `${API_BASE}/notifications/cleanup`,
} as const;

/**
 * 유저 관련 엔드포인트
 */
export const userEndpoints = {
  // 유저 검색
  search: `${API_BASE}/users/search`,
} as const;

/**
 * 취향 분석 관련 엔드포인트
 */
export const tasteAnalysisEndpoints = {
  // 분석 실행
  analyze: `${API_BASE}/taste-analysis/analyze`,
  // 최근 분석 결과
  latest: `${API_BASE}/taste-analysis/latest`,
} as const;

/**
 * 독서 궁합 관련 엔드포인트
 */
export const compatibilityEndpoints = {
  // 궁합 분석 실행
  analyze: `${API_BASE}/compatibility/analyze`,
} as const;

/**
 * 전체 엔드포인트 통합 export
 */
export const endpoints = {
  auth: authEndpoints,
  book: bookEndpoints,
  activity: activityEndpoints,
  follow: followEndpoints,
  notification: notificationEndpoints,
  user: userEndpoints,
  tasteAnalysis: tasteAnalysisEndpoints,
  compatibility: compatibilityEndpoints,
} as const;
