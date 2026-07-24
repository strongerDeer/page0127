import { chromium } from 'playwright';

import type { RuntimeMetrics } from './types';

export const measureRuntime = async (url: string): Promise<RuntimeMetrics> => {
  const origin = new URL(url).origin;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let consoleErrors = 0;
  let consoleWarnings = 0;
  let hydrationWarnings = 0;
  let failedRequests = 0;

  page.on('console', (msg) => {
    const text = msg.text();
    // 독립 카운터 — hydration 경고는 consoleWarnings에도 함께 잡힘(의도)
    if (msg.type() === 'error') consoleErrors += 1;
    if (msg.type() === 'warning') consoleWarnings += 1;
    if (/hydrat/i.test(text)) hydrationWarnings += 1;
  });
  page.on('pageerror', () => {
    consoleErrors += 1;
  });
  page.on('response', (res) => {
    // same-origin만 카운트 — 서드파티/파비콘 4xx 노이즈 제외
    if (res.status() >= 400 && res.url().startsWith(origin)) {
      failedRequests += 1;
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForTimeout(2_000);
  } finally {
    await browser.close();
  }

  return { consoleErrors, consoleWarnings, failedRequests, hydrationWarnings };
};
