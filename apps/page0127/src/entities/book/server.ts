// entities/book 서버 전용 public API
// next/headers 에 의존하는 함수만 모아두는 별도 진입점.
//
// 학습 포인트:
// - 클라이언트 안전 모듈(`bookApi`, 타입 등)이 들어있는 index.ts 와 분리해야
//   `'use client'` 컴포넌트가 배럴을 import 할 때 서버 모듈이 클라이언트
//   번들로 끌려가는 사고를 막을 수 있다.
// - 서버 컴포넌트 / Route Handler / Server Action 에서만 사용한다.
//   (추가 보호가 필요하면 `server-only` 패키지를 설치하고 첫 줄에
//   `import 'server-only';` 를 두면 실수로 클라이언트에서 import 시 빌드 에러)
export { getBookStats } from './api/getBookStats';
export { getAvailableYears, getMyBooks } from './api/getMyBooks';
export { getOverallStats } from './api/getOverallStats';
