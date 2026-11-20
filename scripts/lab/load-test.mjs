#!/usr/bin/env node
/**
 * 캐시 부하 비교 (autocannon) — 로컬 운영 빌드에만 보낸다
 *
 * 사용법:
 *   node scripts/lab/load-test.mjs <라벨> [동시 접속 수] [초]
 *   예) node scripts/lab/load-test.mjs cache-on 50 20
 *
 * 전제: `next build && next start` 가 http://localhost:3000 에 떠 있다.
 *
 * ⚠️ 운영·Vercel 주소에는 절대 보내지 않는다. 짧은 시간에 수만 번 요청하므로
 *    Vercel 함수 CPU 한도(2026-11 초과로 사이트 정지 이력)를 바로 태운다.
 *    그래서 localhost 가 아니면 멈춘다.
 *
 * 세 가지 캐시 층을 대표하는 페이지를 같은 조건으로 두드린다:
 *   - book-info : /books/info/[id]  — 페이지 통째로 캐시(ISR). 서버가 렌더도 DB 도 안 한다
 *   - books-all : /books/all        — 데이터만 캐시(unstable_cache). 렌더는 매번, DB 는 건너뜀
 *   - library   : /[username]       — 캐시 없음. 매번 렌더 + DB 여러 번
 *
 * 재는 것: 초당 처리 요청 수(RPS), 응답시간 p50·p97.5·p99(ms), 에러 수.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.LAB_BASE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) {
  console.error(
    `안전 검사 실패: ${BASE} 는 로컬이 아니에요. 부하 테스트는 로컬에만 보냅니다.`,
  );
  process.exit(1);
}

const label = process.argv[2] ?? "run";
const connections = Number(process.argv[3] ?? 50);
const seconds = Number(process.argv[4] ?? 20);
const bookInfoId = process.env.LAB_BOOK_INFO_ID;
if (!bookInfoId) {
  console.error("LAB_BOOK_INFO_ID 에 global_books 의 id 하나를 넣어 주세요.");
  process.exit(1);
}

const TARGETS = [
  { name: "book-info", path: `/books/info/${bookInfoId}` },
  { name: "books-all", path: "/books/all" },
  // 1만 권 서재는 한 번에 수 MB 라 부하 비교가 아니라 전송 비교가 된다 → 보통 크기 서재로 잰다
  { name: "library", path: `/${process.env.LAB_LIBRARY_USER ?? "lab_small"}` },
];

const run = (url) => {
  const raw = execFileSync(
    "npx",
    [
      "--yes",
      "autocannon@8",
      "-c",
      String(connections),
      "-d",
      String(seconds),
      "-j",
      url,
    ],
    { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
  ).toString();
  const r = JSON.parse(raw);
  return {
    rps: Math.round(r.requests.average),
    p50: r.latency.p50,
    p97_5: r.latency.p97_5,
    p99: r.latency.p99,
    errors: r.errors + r.timeouts + (r.non2xx ?? 0),
    total: r.requests.total,
  };
};

const result = {
  label,
  connections,
  seconds,
  measuredAt: new Date().toISOString(),
  targets: {},
};
for (const target of TARGETS) {
  // 첫 요청은 캐시를 채우는 요청이라 따로 한 번 보낸다(데우기)
  await fetch(BASE + target.path);
  result.targets[target.name] = run(BASE + target.path);
  console.log(target.name, result.targets[target.name]);
}

mkdirSync("scripts/lab/results", { recursive: true });
writeFileSync(
  `scripts/lab/results/load-${label}.json`,
  JSON.stringify(result, null, 2),
);
console.log(`저장: scripts/lab/results/load-${label}.json`);
