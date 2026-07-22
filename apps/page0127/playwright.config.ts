import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 설정 (공개 플로우 smoke test)
 *
 * 학습 포인트:
 * - webServer: 테스트 실행 전 앱을 자동으로 띄운다. 기본 dev 포트(3000)를 대상으로,
 *   이미 떠 있는 dev 서버가 있으면 재사용하고 없으면 새로 기동한다.
 *   (public 페이지 렌더링·미들웨어 검증에는 프로덕션 빌드가 불필요하므로 dev로 단순화)
 * - Next.js 16은 같은 프로젝트에서 dev 서버를 2개 띄우지 못하게 막으므로(포트가 달라도),
 *   별도 포트를 쓰기보다 기존 dev 서버를 재사용하는 편이 로컬에서 안정적이다.
 * - reuseExistingServer: 로컬에서는 이미 뜬 서버를 재사용, CI에서는 항상 새로 띄운다.
 * - baseURL: page.goto('/login') 처럼 상대경로로 이동할 수 있게 한다.
 */
const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // 각 테스트 파일을 병렬 실행
  fullyParallel: true,
  // CI에서 test.only가 실수로 커밋되면 실패시킨다
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',

  use: {
    baseURL,
    // 실패한 테스트 재시도 시에만 trace 수집 (디버깅용)
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    // 재사용 판단·접속에 쓰는 주소. 이미 3000에 dev가 떠 있으면 그 서버를 쓴다.
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // 첫 부팅 + 컴파일에 시간이 걸릴 수 있어 넉넉히 잡는다
    timeout: 120_000,
  },
});
