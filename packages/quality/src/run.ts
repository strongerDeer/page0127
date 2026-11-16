import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze } from './analyze.ts';
import { measureBuild } from './build.ts';
import { APP, FORM_FACTORS, LIGHTHOUSE_RUNS } from './config.ts';
import { measureField, measureFieldHistory } from './crux.ts';
import { measureLighthouseMedian } from './lighthouse.ts';
import {
  assembleRecord,
  BUILD_PART_FILE,
  type BuildPart,
  lighthousePartFile,
  type LighthousePart,
  readPart,
  writePart,
} from './parts.ts';
import { buildNarrative } from './report.ts';
import { measureRuntime } from './runtime.ts';
import { measureSeo } from './seo.ts';
import { readPriorRecords, saveFieldHistoryToDb, saveRecord } from './store.ts';
import type {
  FormFactor,
  MeasureEnvironment,
  PageMetrics,
} from './types.ts';

// 번들/코드건강을 측정할 대상 = page0127 앱 디렉터리(자기 repo).
// shop-chart처럼 별도 repo를 체크아웃하지 않는다 — CI가 이미 page0127을 체크아웃해 둔다.
//
// 반드시 저장소 루트 기준 절대경로로 만든다. `npm run measure -w @repo/quality` 는
// packages/quality 에서 실행되므로, 상대경로 'apps/page0127' 은 없는 폴더를 가리킨다.
// 그 상태로 빌드가 0초 만에 출력 없이 실패해 번들·코드건강이 0, gitRef 가
// 'unknown' 으로 기록돼 왔다(2026-09-28 실행 로그로 확인).
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const BUILD_PATH = resolve(
  REPO_ROOT,
  process.env.QUALITY_BUILD_PATH ?? 'apps/page0127'
);

const gitRef = (repoPath: string): string => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: repoPath,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
};

// 측정 환경은 첫 페이지 것을 쓴다 — 한 실행 안에서 Chrome·Lighthouse·러너는 같다.
const measurePages = async (
  formFactor: FormFactor
): Promise<{ pages: PageMetrics[]; environment?: MeasureEnvironment }> => {
  const pages: PageMetrics[] = [];
  let environment: MeasureEnvironment | undefined;
  for (const p of APP.pages) {
    const url = `${APP.targetUrl}${p.path}`;
    const lh = await measureLighthouseMedian(url, LIGHTHOUSE_RUNS, formFactor);
    environment ??= lh.environment;
    pages.push({
      name: p.name,
      url,
      formFactor,
      lighthouse: lh.lighthouse,
      cwv: lh.cwv,
      weight: lh.weight,
      samples: lh.samples,
      lcpSpreadMs: lh.lcpSpreadMs,
      tbtSpreadMs: lh.tbtSpreadMs,
    });
  }
  return { pages, environment };
};

// ── 실행 단계(phase) ─────────────────────────────────────────────────────
// CI(quality.yml)는 시간을 줄이려고 측정을 러너 여러 대에 나눠 동시에 돌린다.
//   lighthouse : LH_FORM_FACTORS 의 폼팩터만 Lighthouse 측정 → 조각 JSON
//   build      : SEO·런타임·next build·tsc·eslint            → 조각 JSON
//   report     : 조각을 모아 CrUX·회귀 분석·AI 해석 → Supabase 저장
//   all(기본)  : 위 셋을 한 프로세스에서 차례로(로컬 확인용, 예전 동작과 같다)
//
// 왜 Lighthouse 를 한 러너 안에서 동시에 돌리지 않고 러너를 나누나:
// 같은 컴퓨터에서 동시에 돌리면 CPU 를 나눠 써서 점수가 실제보다 나쁘게 나온다.
// 러너가 다르면 서로 간섭이 없다.
type Phase = 'lighthouse' | 'build' | 'report' | 'all';
const PHASES: Phase[] = ['lighthouse', 'build', 'report', 'all'];

const parsePhase = (raw: string | undefined): Phase => {
  const phase = (raw ?? 'all') as Phase;
  if (!PHASES.includes(phase)) {
    throw new Error(`알 수 없는 단계: '${raw}' (허용: ${PHASES.join(', ')})`);
  }
  return phase;
};

// job 사이에 넘기는 조각 JSON 폴더. CI 는 이 폴더를 artifact 로 올리고 내려받는다.
const PARTS_DIR = resolve(
  REPO_ROOT,
  process.env.QUALITY_PARTS_DIR ?? 'packages/quality/.parts'
);

const homeUrl = `${APP.targetUrl}${APP.pages[0]?.path ?? '/'}`;

const runLighthouse = async (): Promise<void> => {
  for (const formFactor of FORM_FACTORS) {
    const { pages, environment } = await measurePages(formFactor);
    const part: LighthousePart = {
      formFactor,
      pages,
      ...(environment ? { environment } : {}),
    };
    writePart(PARTS_DIR, lighthousePartFile(formFactor), part);
    if (environment) {
      console.error(
        `[quality] 측정 환경(${formFactor}): Chrome ${environment.chromeVersion} · Lighthouse ${environment.lighthouseVersion} · 러너 ${environment.runnerImage} · 성능지수 ${environment.benchmarkIndex}`
      );
    }
    console.error(`[quality] Lighthouse ${formFactor} ${pages.length}페이지 완료`);
  }
};

const runBuild = async (): Promise<void> => {
  const homeHtml = await fetch(homeUrl).then((r) => r.text());
  const seo = await measureSeo(APP.targetUrl, homeHtml);
  const runtime = await measureRuntime(homeUrl);
  const build = measureBuild(BUILD_PATH);
  const part: BuildPart = { gitRef: gitRef(BUILD_PATH), build, seo, runtime };
  writePart(PARTS_DIR, BUILD_PART_FILE, part);
  console.error(`[quality] 빌드·SEO·런타임 완료 (빌드 ${build.buildTimeSec}초)`);
};

const runReport = async (): Promise<void> => {
  // CrUX는 외부 API 의존 → 실패해도 측정 전체를 죽이지 않는다. 없으면 field undefined.
  let field;
  try {
    field = await measureField(homeUrl);
  } catch (e) {
    console.warn('[quality] CrUX 조회 실패 — 필드 지표 없이 진행:', e);
  }
  try {
    const fieldHistory = await measureFieldHistory(homeUrl);
    if (fieldHistory) await saveFieldHistoryToDb(fieldHistory);
  } catch (e) {
    console.warn('[quality] CrUX 추세 조회 실패 — 추세 없이 진행:', e);
  }

  const record = assembleRecord({
    mobile: readPart<LighthousePart>(PARTS_DIR, lighthousePartFile('mobile')),
    desktop: readPart<LighthousePart>(PARTS_DIR, lighthousePartFile('desktop')),
    build: readPart<BuildPart>(PARTS_DIR, BUILD_PART_FILE),
    field,
    app: { name: APP.name, env: APP.env, targetUrl: APP.targetUrl },
    timestamp: new Date().toISOString(),
  });

  // 단일 앱(page0127)이라 앱 필터가 필요 없다 — 최근 레코드를 그대로 회귀 기준으로 쓴다.
  const priorHistory = await readPriorRecords();
  const analysis = analyze([...priorHistory, record]);
  record.analysisComment = await buildNarrative(analysis);
  record.regressions = analysis.regressions;
  record.suppressedRegressions = analysis.suppressedRegressions;

  await saveRecord(record, record.analysisComment ?? '');
  console.error(
    `[quality] 완료: ${APP.name} (회귀 ${analysis.regressions.length}건)`
  );
};

const main = async (): Promise<void> => {
  const phase = parsePhase(process.argv[2]);
  console.error(
    `[quality] ${phase} 단계 시작: ${APP.name} (폼팩터: ${FORM_FACTORS.join(', ')})`
  );
  if (phase === 'lighthouse' || phase === 'all') await runLighthouse();
  if (phase === 'build' || phase === 'all') await runBuild();
  if (phase === 'report' || phase === 'all') await runReport();
};

// 실패 원인을 나눠서 알린다(uptime.yml과 같은 이유). "품질 측정 실패" 한 줄만
// 보이면 받는 사람이 로그를 열어 스택을 읽어야 한다. 아래 두 경우는 대응이 다르다 —
// 자격증명을 고칠 것인가, 측정 대상 사이트를 볼 것인가.
//
// 42501은 실제로 4주간(2026-08-03~08-24) 이 워크플로를 조용히 죽였다: 측정은
// 매번 성공하고 마지막 insert만 실패해서, 로그 끝을 보지 않으면 알 수 없었다.
const explain = (e: unknown): string => {
  const err = e as { code?: string; message?: string };
  if (err?.code === '42501') {
    return [
      'DB 저장 거부(RLS) — 측정은 성공했지만 기록되지 않았습니다.',
      'service_role이 아닌 키로 붙었다는 뜻입니다(키가 틀렸다면 401이 납니다).',
      '대응: GitHub secret PRODUCTION_SUPABASE_SERVICE_ROLE_KEY에 운영 프로젝트의 secret 키를 다시 넣습니다.',
    ].join(' ');
  }
  return `품질 측정 실패: ${err?.message ?? String(e)}`;
};

main().catch((e) => {
  console.error('[quality] 실패:', e);
  // ::error:: 는 GitHub Actions가 요약 화면 최상단에 띄운다 — 로그를 안 열어도 보인다.
  console.error(`::error::${explain(e)}`);
  process.exitCode = 1;
});
