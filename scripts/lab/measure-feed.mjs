#!/usr/bin/env node
/**
 * 피드 무한 스크롤 측정 (Playwright)
 *
 * 사용법:
 *   node scripts/lab/measure-feed.mjs <라벨> [반복]
 *
 * 전제: 로컬 운영 빌드가 localhost:3000 에 떠 있고, seed-feed.mjs 로 lab_reader 활동이 채워져 있다.
 *
 * 요청 제한: 로컬 DB 의 lab_reader 카운터를 페이지마다 비워 429 없이 끝까지 내린다.
 * 흐름: lab_reader 로 로그인 → /feed → 바닥까지 계속 내려 활동을 전부(50페이지) 불러온다.
 * 재는 것:
 *   - allLoaded  : 1,000개를 끝까지 다 불러왔는지(아니면 결과를 믿지 않는다)
 *   - cards      : 화면에 실제로 그려진 활동 카드 수
 *   - tbtMs      : 첫 화면부터 다 불러올 때까지 Long Task 50ms 초과분 합
 *   - dom        : DOM 노드 수
 *   - heapMB     : JS 힙 사용량 — 카드가 쌓일수록 메모리가 는다
 *   - loadMoreMs : 마지막 10페이지를 불러올 때 가장 긴 Long Task — 페이지가 붙을 때마다 멈추는 시간
 *   - scrollJankMs : 다 불러온 뒤 맨 위로 훑어 올라갈 때 50ms 넘은 프레임 초과분 합
 *   - clickMs    : 다 불러온 뒤 카드의 버튼을 눌렀을 때 반응(Event Timing)
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const BASE = process.env.LAB_BASE_URL ?? "http://localhost:3000";
const label = process.argv[2] ?? "feed";
const repeat = Number(process.argv[3] ?? 3);
const CPU_SLOWDOWN = 4;

// ── 로그인 세션 만들기: Supabase 에 비밀번호로 로그인 → @supabase/ssr 쿠키 형식으로 심는다
const raw = execSync("supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString();
const status = JSON.parse(raw.slice(raw.indexOf("{")));
const apiUrl = new URL(status.API_URL);
if (!["127.0.0.1", "localhost"].includes(apiUrl.hostname)) {
  console.error("안전 검사 실패: 로컬 Supabase 가 아니에요.");
  process.exit(1);
}
const auth = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false } });
const { data: signIn, error } = await auth.auth.signInWithPassword({
  email: "lab-reader@example.test",
  password: "lab-reader-local-only",
});
if (error) throw error;
// 앱의 API 요청 제한(로그인 사용자 60회/분)은 50페이지를 빠르게 내리면 걸린다.
// 렌더 비용만 보려는 실험이라, 로컬 DB 의 lab_reader 카운터만 페이지마다 비운다(운영 코드는 그대로).
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const resetRateLimit = () =>
  admin.from("rate_limits").delete().like("identifier", `%user:${signIn.user.id}`);

const cookieName = `sb-${apiUrl.hostname.split(".")[0]}-auth-token`;
const cookieValue = `base64-${Buffer.from(JSON.stringify(signIn.session)).toString("base64url")}`;

const observerScript = () => {
  window.__lab = { longTasks: [], events: [] };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__lab.longTasks.push({ t: e.startTime, d: e.duration });
  }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__lab.events.push({ name: e.name, duration: e.duration });
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const measureOnce = async (browser) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addCookies([
    { name: cookieName, value: cookieValue, domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();
  await page.addInitScript(observerScript);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
  await cdp.send("Performance.enable");

  await resetRateLimit();
  await page.goto(`${BASE}/feed`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForSelector("text=모든 활동을 불러왔습니다", { state: "attached", timeout: 2000 }).catch(() => {});

  // 바닥까지 내리며 다 불러오기. 마지막 10페이지 구간의 Long Task 를 따로 본다
  let loadMoreMs = 0;
  for (let i = 0; i < 80; i += 1) {
    const done = await page.locator("text=모든 활동을 불러왔습니다").count();
    if (done) break;
    await resetRateLimit();
    const before = await page.evaluate(() => window.__lab.longTasks.length);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);
    if (i >= 40) {
      const worst = await page.evaluate(
        (from) => Math.max(0, ...window.__lab.longTasks.slice(from).map((x) => x.d)),
        before
      );
      loadMoreMs = Math.max(loadMoreMs, worst);
    }
  }

  const snapshot = await page.evaluate(() => ({
    // 첫 화면부터 지금까지 Long Task 의 50ms 초과분 합(TBT 방식)
    tbtMs: Math.round(window.__lab.longTasks.reduce((sum, x) => sum + Math.max(0, x.d - 50), 0)),
    allLoaded: document.body.innerText.includes("모든 활동을 불러왔습니다"),
    cards: document.querySelectorAll("div.divide-y > *").length,
    dom: document.querySelectorAll("*").length,
  }));
  await cdp.send("HeapProfiler.collectGarbage");
  const { usedSize } = await cdp.send("Runtime.getHeapUsage");

  // 맨 위로 훑어 올라가기
  const scrollJankMs = await page.evaluate(async () => {
    let jank = 0;
    let last = performance.now();
    let running = true;
    const tick = (now) => {
      if (now - last > 50) jank += now - last - 50;
      last = now;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    for (let y = document.documentElement.scrollHeight; y > 0; y -= 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    running = false;
    return Math.round(jank);
  });

  // 카드 버튼 하나 눌러 반응 재기 (좋아요·댓글 등 첫 번째 버튼)
  await resetRateLimit();
  await page.evaluate(() => (window.__lab.events = []));
  const button = page.locator("div.divide-y > * button").first();
  let clickMs = null;
  if (await button.count()) {
    await button.click();
    await page.waitForTimeout(1000);
    clickMs = await page.evaluate(() =>
      Math.max(0, ...window.__lab.events.filter((e) => /pointer|click/.test(e.name)).map((e) => e.duration))
    );
  }

  await context.close();
  return {
    allLoaded: snapshot.allLoaded,
    cards: snapshot.cards,
    tbtMs: snapshot.tbtMs,
    dom: snapshot.dom,
    heapMB: Math.round(usedSize / 1024 / 1024),
    loadMoreMs: Math.round(loadMoreMs),
    scrollJankMs,
    clickMs: clickMs === null ? null : Math.round(clickMs),
  };
};

const browser = await chromium.launch(
  process.env.LAB_CHROME_PATH ? { executablePath: process.env.LAB_CHROME_PATH } : {}
);
const runs = [];
for (let i = 0; i < repeat; i += 1) {
  const run = await measureOnce(browser);
  console.log(run);
  runs.push(run);
}
await browser.close();

const result = {
  label,
  cpuSlowdown: CPU_SLOWDOWN,
  measuredAt: new Date().toISOString(),
  feed: Object.fromEntries(
    Object.keys(runs[0]).map((key) => [
      key,
      key === "allLoaded"
        ? runs.every((r) => r.allLoaded)
        : runs[0][key] === null
          ? null
          : median(runs.map((r) => r[key])),
    ])
  ),
};
mkdirSync("scripts/lab/results", { recursive: true });
writeFileSync(`scripts/lab/results/feed-${label}.json`, JSON.stringify(result, null, 2));
console.log("중간값", result.feed);
