import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

/**
 * 스토리를 테스트로 돌리는 설정 — 접근성 회귀를 CI 에서 막기 위한 것.
 *
 * 기존 `vitest.config.ts` 와 **일부러 분리했다.** 그쪽은 순수 함수용 `node` 환경이라
 * 브라우저가 필요 없고 secrets 도 필요 없다. 여기에 브라우저 설정을 섞으면 빠른
 * 단위 테스트까지 매번 Chromium 을 띄우게 된다.
 *
 * 하는 일: 모든 스토리를 실제 Chromium 에서 렌더하고, `preview.tsx` 의
 * `a11y.test` 설정에 따라 axe 검사를 돌린다. `'error'` 면 위반이 곧 테스트 실패다.
 *
 * 실행: `npm run test:storybook -w page0127`
 * (Chromium 이 없으면 `npx playwright install chromium` 이 먼저 필요하다)
 */
export default defineConfig({
  plugins: [storybookTest({ configDir: '.storybook' })],
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      headless: true,
      // vitest 4 부터 provider 는 문자열이 아니라 팩토리를 받는다
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    // setupFiles 는 두지 않는다 — Storybook 10.3+ 의 addon-vitest 가
    // preview 의 데코레이터·parameters 를 자동으로 적용한다.
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/shared': resolve(__dirname, './src/shared'),
      '@/entities': resolve(__dirname, './src/entities'),
      '@/features': resolve(__dirname, './src/features'),
      '@/widgets': resolve(__dirname, './src/widgets'),
      '@/app': resolve(__dirname, './app'),
    },
  },
});
