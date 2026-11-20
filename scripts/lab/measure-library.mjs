#!/usr/bin/env node
/**
 * 서재 렌더링 측정 (Playwright + Chrome DevTools Protocol)
 *
 * 사용법:
 *   node scripts/lab/measure-library.mjs [라벨] [반복 횟수]
 *   예) node scripts/lab/measure-library.mjs baseline-10000 3
 *
 * 전제: `next build && next start` 로 운영 빌드가 http://localhost:3000 에 떠 있고,
 *       seed-large-library.mjs 로 /lab_reader 서재가 채워져 있다.
 *
 * 재는 것 (보기마다 = 연도 보기 / 전체 보기):
 *   - htmlKB      : 첫 HTML 크기. RSC payload(서버가 클라이언트 컴포넌트에 넘기는 props JSON)가
 *                   HTML 안에 인라인으로 들어 있어서, 이 숫자가 곧 "보내는 양"이다
 *   - tbtMs       : Total Blocking Time. 50ms 넘는 Long Task 의 초과분 합 — 첫 화면에서 메인 스레드가 막힌 시간
 *   - longTasks   : Long Task 개수
 *   - dom         : 화면이 안정된 뒤 DOM 노드 수 — "그리는 양"
 *   - shelfBooks  : 책장에 꽂힌 책 칸 수
 *   - searchMs    : 검색창에 글자를 칠 때 가장 느린 입력 반응(INP 와 같은 방식: Event Timing API)
 *   - scrollJankMs: 전체 보기를 끝까지 스크롤할 때 50ms 넘은 프레임들의 초과분 합
 *
 * CPU 를 4배 느리게 해서(중급 모바일 흉내) 차이를 키운다. 반복한 뒤 중간값을 쓴다.
 */
import { writeFileSync, mkdirSync } from "node:fs";

import { chromium } from "playwright";

const BASE = process.env.LAB_BASE_URL ?? "http://localhost:3000";
const label = process.argv[2] ?? "run";
const repeat = Number(process.argv[3] ?? 3);
const CPU_SLOWDOWN = 4;

const VIEWS = [
  { name: "year", path: "/lab_reader" },
  { name: "all", path: "/lab_reader?year=all" },
];

/** 페이지가 열리기 전에 심어 두는 관측기 — Long Task 와 입력 반응을 처음부터 모은다 */
const observerScript = () => {
  window.__lab = { longTasks: [], events: [] };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      window.__lab.longTasks.push(entry.duration);
  }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__lab.events.push({ name: entry.name, duration: entry.duration });
    }
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const measureOnce = async (browser, view) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(observerScript);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });

  await page.goto(BASE + view.path, { waitUntil: "load", timeout: 120_000 });
  // 뒤늦은 하이드레이션·통계 계산까지 끝나게 잠시 둔다
  await page.waitForTimeout(3000);

  const first = await page.evaluate(() => ({
    longTasks: window.__lab.longTasks.length,
    tbt: window.__lab.longTasks.reduce(
      (sum, d) => sum + Math.max(0, d - 50),
      0,
    ),
    dom: document.querySelectorAll("*").length,
    // 책장에 실제로 꽂힌 책 수 — 서버가 몇 권을 보냈는지 확인용
    shelfBooks: document.querySelectorAll('ul[class*="books"] > li').length,
  }));

  // 검색 입력 반응 — 기존 이벤트 기록을 비우고 한 글자씩 친다
  let searchMs = null;
  // 검색창은 "검색" 버튼을 눌러야 열린다
  const searchToggle = page.getByRole("button", { name: "검색", exact: true });
  if (await searchToggle.count()) await searchToggle.first().click();
  const search = page.getByPlaceholder("제목이나 저자로 검색");
  await search
    .first()
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  if (await search.count()) {
    await page.evaluate(() => (window.__lab.events = []));
    await search.first().click();
    await page.keyboard.type("바다", { delay: 150 });
    await page.waitForTimeout(1500);
    searchMs = await page.evaluate(() =>
      Math.max(
        0,
        ...window.__lab.events
          .filter((e) => /key|input|pointer|click/.test(e.name))
          .map((e) => e.duration),
      ),
    );
    await search.first().fill("");
    await page.waitForTimeout(1000);
  }

  // 스크롤 버벅임 — 전체 보기에서만 의미가 크다
  let scrollJankMs = null;
  if (view.name === "all") {
    scrollJankMs = await page.evaluate(async () => {
      let jank = 0;
      let last = performance.now();
      let running = true;
      const tick = (now) => {
        const gap = now - last;
        if (gap > 50) jank += gap - 50;
        last = now;
        if (running) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const total = document.documentElement.scrollHeight;
      for (let y = 0; y < total; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      running = false;
      return Math.round(jank);
    });
  }

  await context.close();
  return {
    // HTML 크기는 브라우저 밖에서 따로 받는다 — 10MB 넘는 응답은 DevTools 캐시에서 지워져 못 읽는다
    htmlKB: Math.round(
      (await (await fetch(BASE + view.path)).arrayBuffer()).byteLength / 1024,
    ),
    tbtMs: Math.round(first.tbt),
    longTasks: first.longTasks,
    dom: first.dom,
    shelfBooks: first.shelfBooks,
    searchMs: searchMs === null ? null : Math.round(searchMs),
    scrollJankMs,
  };
};

// LAB_CHROME_PATH: 리포의 Playwright 버전과 맞는 브라우저가 없을 때 직접 지정
const browser = await chromium.launch(
  process.env.LAB_CHROME_PATH
    ? { executablePath: process.env.LAB_CHROME_PATH }
    : {},
);
const result = {
  label,
  cpuSlowdown: CPU_SLOWDOWN,
  measuredAt: new Date().toISOString(),
  views: {},
};

for (const view of VIEWS) {
  const runs = [];
  // 첫 요청은 서버 캐시·JIT 데우기용으로 버린다
  await measureOnce(browser, view);
  for (let i = 0; i < repeat; i += 1)
    runs.push(await measureOnce(browser, view));
  const keys = Object.keys(runs[0]);
  result.views[view.name] = Object.fromEntries(
    keys.map((key) => [
      key,
      runs[0][key] === null ? null : median(runs.map((run) => run[key])),
    ]),
  );
  console.log(view.name, result.views[view.name]);
}
await browser.close();

mkdirSync("scripts/lab/results", { recursive: true });
writeFileSync(
  `scripts/lab/results/${label}.json`,
  JSON.stringify(result, null, 2),
);
console.log(`저장: scripts/lab/results/${label}.json`);
