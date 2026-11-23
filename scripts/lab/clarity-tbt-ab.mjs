#!/usr/bin/env node
/**
 * Clarity 가 모바일 TBT 를 얼마나 늘리는지 — 같은 페이지를 "허용 / 차단"으로 번갈아 잰다.
 *
 * 사용법 (lab-clarity-ab 워크플로가 부른다. 로컬도 같음):
 *   node scripts/lab/clarity-tbt-ab.mjs [반복 횟수=5]
 *
 * 왜 번갈아 재나: 러너 성능이 시간에 따라 흔들려서, 허용 5번 → 차단 5번으로 몰아 재면
 * 그 흔들림이 차이로 보인다. 허용·차단·허용·차단… 으로 섞으면 흔들림이 양쪽에 고루 들어간다.
 *
 * 조건은 quality 주간 측정과 같다: Lighthouse mobile 기본값(simulate, 느린4G·CPU 4x).
 * 차단은 Lighthouse blockedUrlPatterns 로 clarity.ms 요청만 막는다(사이트 코드는 그대로).
 *
 * 2026-11-23 quality 리포트에서 library·profile·bookinfo TBT 가 200~330ms 늘었고,
 * 그사이 들어온 것 중 모든 페이지에 붙는 건 Clarity(#472, 11/22)뿐이라 확인하려고 만들었다.
 */
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const BASE = process.env.TARGET_URL ?? 'https://page0127.com';
const RUNS = Math.max(1, Number(process.argv[2] ?? 5));
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'library', path: '/books/all' },
  { name: 'profile', path: '/stronger_khj' },
  { name: 'bookinfo', path: '/books/info/20796404-2d51-44ac-a11b-faf9cd4ea596' },
];
const BLOCK = ['*clarity.ms*'];

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const runOnce = async (url, blocked) => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  try {
    const { lhr } = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance'],
      blockedUrlPatterns: blocked ? BLOCK : [],
    });
    const a = lhr.audits;
    // 제3자 요약에서 Clarity 줄 — 메인 스레드 시간·막은 시간·전송량
    const third = a['third-party-summary']?.details?.items ?? [];
    const clarity = third.find((i) =>
      JSON.stringify(i.entity ?? '').toLowerCase().includes('clarity')
    );
    return {
      tbt: Math.round(a['total-blocking-time'].numericValue),
      score: Math.round(lhr.categories.performance.score * 100),
      clarityMainMs: Math.round(clarity?.mainThreadTime ?? 0),
      clarityBlockMs: Math.round(clarity?.blockingTime ?? 0),
      clarityKb: Math.round((clarity?.transferSize ?? 0) / 1024),
    };
  } finally {
    await chrome.kill();
  }
};

const rows = [];
for (const page of PAGES) {
  const url = BASE + page.path;
  const allow = [];
  const block = [];
  for (let i = 0; i < RUNS; i += 1) {
    allow.push(await runOnce(url, false));
    block.push(await runOnce(url, true));
    console.log(
      `${page.name} #${i + 1} 허용 TBT ${allow.at(-1).tbt}ms (Clarity 막은 시간 ${allow.at(-1).clarityBlockMs}ms) · 차단 TBT ${block.at(-1).tbt}ms`
    );
  }
  const tbts = (rs) => rs.map((r) => r.tbt);
  rows.push({
    page: page.name,
    allowTbt: median(tbts(allow)),
    blockTbt: median(tbts(block)),
    allowScore: median(allow.map((r) => r.score)),
    blockScore: median(block.map((r) => r.score)),
    clarityMainMs: median(allow.map((r) => r.clarityMainMs)),
    clarityBlockMs: median(allow.map((r) => r.clarityBlockMs)),
    clarityKb: median(allow.map((r) => r.clarityKb)),
    allowRange: `${Math.min(...tbts(allow))}~${Math.max(...tbts(allow))}`,
    blockRange: `${Math.min(...tbts(block))}~${Math.max(...tbts(block))}`,
  });
}

const md = [
  `## Clarity 허용 vs 차단 — 모바일 TBT (각 ${RUNS}회 중앙값, ${BASE})`,
  '',
  '| 페이지 | TBT 허용 | TBT 차단 | 차이 | 점수 허용→차단 | Clarity 메인스레드 | Clarity 막은 시간 | Clarity 전송 | 허용 범위 | 차단 범위 |',
  '|---|---:|---:|---:|---|---:|---:|---:|---|---|',
  ...rows.map(
    (r) =>
      `| ${r.page} | ${r.allowTbt}ms | ${r.blockTbt}ms | ${r.allowTbt - r.blockTbt}ms | ${r.allowScore}→${r.blockScore} | ${r.clarityMainMs}ms | ${r.clarityBlockMs}ms | ${r.clarityKb}KB | ${r.allowRange} | ${r.blockRange} |`
  ),
].join('\n');
console.log(`\n${md}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
}
