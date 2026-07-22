import { defineConfig } from 'vitest/config';

// 순수 함수 단위 테스트만 돌린다(노드 환경).
// 화면·서버 연결은 type-check/build/개발서버로 확인한다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
