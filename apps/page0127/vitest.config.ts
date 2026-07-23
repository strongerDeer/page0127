import { defineConfig } from 'vitest/config';

/**
 * Vitest 설정 (순수 함수 단위 테스트)
 *
 * 학습 포인트:
 * - environment: 'node'
 *   브라우저 DOM이 필요 없는 순수 함수만 검증하므로 가장 가벼운 node 환경을 쓴다.
 *   (jsdom을 켤 필요가 없어 빠르고, Supabase 서버도 띄우지 않는다 → CI에서 secrets 불필요)
 * - include: '.test.ts'만 수집
 *   Playwright 스모크는 e2e/ 폴더의 '.spec.ts'를 쓰므로, 여기서는 확장자를 '.test.ts'로
 *   분리해 vitest가 Playwright 스펙을 실수로 집어가지 않게 한다.
 *   (vitest = *.test.ts / playwright = e2e/*.spec.ts 로 역할을 나눈다)
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['{src,app}/**/*.test.{ts,tsx}'],
  },
});
