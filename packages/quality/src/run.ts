import { execSync } from 'node:child_process';

import { analyze } from './analyze.ts';
import { measureBuild } from './build.ts';
import { APP, FORM_FACTORS, LIGHTHOUSE_RUNS } from './config.ts';
import { measureField, measureFieldHistory } from './crux.ts';
import { measureLighthouseMedian } from './lighthouse.ts';
import { buildNarrative } from './report.ts';
import { measureRuntime } from './runtime.ts';
import { measureSeo } from './seo.ts';
import { readPriorRecords, saveFieldHistoryToDb, saveRecord } from './store.ts';
import type { FormFactor, PageMetrics, QualityRecord } from './types.ts';

// 번들/코드건강을 측정할 대상 = page0127 앱 디렉터리(자기 repo).
// shop-chart처럼 별도 repo를 체크아웃하지 않는다 — CI가 이미 page0127을 체크아웃해 둔다.
const BUILD_PATH = process.env.QUALITY_BUILD_PATH ?? 'apps/page0127';

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

const measurePages = async (formFactor: FormFactor): Promise<PageMetrics[]> => {
  const pages: PageMetrics[] = [];
  for (const p of APP.pages) {
    const url = `${APP.targetUrl}${p.path}`;
    const lh = await measureLighthouseMedian(url, LIGHTHOUSE_RUNS, formFactor);
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
  return pages;
};

const main = async (): Promise<void> => {
  console.error(
    `[quality] 측정 시작: ${APP.name} (폼팩터: ${FORM_FACTORS.join(', ')})`
  );

  // 모바일은 히스토리 연속성의 기준. 없으면 기록하지 않는다(회귀 시계열 단절 방지).
  const pages = FORM_FACTORS.includes('mobile')
    ? await measurePages('mobile')
    : [];
  if (pages.length === 0) {
    throw new Error(
      'LH_FORM_FACTORS에 mobile이 없어 기준 시계열을 만들 수 없습니다.'
    );
  }
  const desktopPages = FORM_FACTORS.includes('desktop')
    ? await measurePages('desktop')
    : undefined;

  const homeUrl = `${APP.targetUrl}${APP.pages[0]?.path ?? '/'}`;
  const homeHtml = await fetch(homeUrl).then((r) => r.text());
  const seo = await measureSeo(APP.targetUrl, homeHtml);
  const runtime = await measureRuntime(homeUrl);

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

  const build = measureBuild(BUILD_PATH);

  const record: QualityRecord = {
    timestamp: new Date().toISOString(),
    app: APP.name,
    env: APP.env,
    targetUrl: APP.targetUrl,
    gitRef: gitRef(BUILD_PATH),
    pages,
    ...(desktopPages ? { desktopPages } : {}),
    bundle: build.bundle,
    buildTimeSec: build.buildTimeSec,
    ...(field ? { field } : {}),
    seo,
    runtime,
    codeHealth: build.codeHealth,
  };

  // 단일 앱(page0127)이라 앱 필터가 필요 없다 — 최근 레코드를 그대로 회귀 기준으로 쓴다.
  const priorHistory = await readPriorRecords();
  const analysis = analyze([...priorHistory, record]);
  record.analysisComment = buildNarrative(analysis);
  record.regressions = analysis.regressions;
  record.suppressedRegressions = analysis.suppressedRegressions;

  await saveRecord(record, record.analysisComment ?? '');
  console.error(
    `[quality] 완료: ${APP.name} (회귀 ${analysis.regressions.length}건)`
  );
};

main().catch((e) => {
  console.error('[quality] 실패:', e);
  process.exitCode = 1;
});
