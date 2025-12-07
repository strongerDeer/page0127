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
  },
  // 향후 추가될 엔티티들 (예시)
  // users: {
  //   profile: '/users/profile',
  //   settings: '/users/settings',
  // },
} as const;
