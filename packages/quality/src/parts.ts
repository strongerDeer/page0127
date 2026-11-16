import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { BuildResult } from './build.ts';
import type {
  FieldMetrics,
  FormFactor,
  MeasureEnvironment,
  PageMetrics,
  QualityRecord,
  RuntimeMetrics,
  SeoMetrics,
} from './types.ts';

// ── 병렬 측정의 "중간 결과" ────────────────────────────────────────────────
// CI는 측정을 러너 여러 대에 나눠 동시에 돌린다(quality.yml).
//   lighthouse(mobile) ─┐
//   lighthouse(desktop) ┼─▶ report: 조각을 모아 QualityRecord 하나로 → 분석·저장
//   build ──────────────┘
// job 은 서로 다른 컴퓨터라 메모리를 공유하지 못한다. 그래서 각 job 이 결과를
// JSON 파일(조각)로 남기고, GitHub artifact 로 report job 에 넘긴다.

export type LighthousePart = {
  formFactor: FormFactor;
  pages: PageMetrics[];
  environment?: MeasureEnvironment;
};

export type BuildPart = {
  gitRef: string;
  build: BuildResult;
  seo: SeoMetrics;
  runtime: RuntimeMetrics;
};

export const lighthousePartFile = (formFactor: FormFactor): string =>
  `lighthouse-${formFactor}.json`;
export const BUILD_PART_FILE = 'build.json';

export const writePart = (dir: string, file: string, data: unknown): void => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), JSON.stringify(data, null, 2));
};

export const readPart = <T>(dir: string, file: string): T | undefined => {
  try {
    return JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
  } catch {
    // 파일 없음 = 그 측정이 돌지 않았다(예: 데스크톱 job 을 끈 경우). 판단은 호출부가 한다.
    return undefined;
  }
};

type AssembleInput = {
  mobile: LighthousePart | undefined;
  desktop: LighthousePart | undefined;
  build: BuildPart | undefined;
  field: FieldMetrics | undefined;
  app: { name: string; env: QualityRecord['env']; targetUrl: string };
  timestamp: string;
};

/**
 * 조각들을 저장용 레코드 하나로 합친다. 순수 함수라 단위 테스트로 지킨다.
 *
 * - 모바일은 히스토리 연속성의 기준이라 없으면 실패시킨다(기존 run.ts 와 같은 규칙).
 * - 빌드 조각이 없으면 번들·코드건강을 0으로 기록하게 되어 회귀가 가짜로 잡힌다 → 실패.
 * - 데스크톱은 선택. 측정 환경은 모바일 러너 것을 쓴다(모바일이 회귀 판정의 기준 시계열).
 */
export const assembleRecord = (input: AssembleInput): QualityRecord => {
  const { mobile, desktop, build, field, app, timestamp } = input;
  if (!mobile || mobile.pages.length === 0) {
    throw new Error(
      '모바일 Lighthouse 조각이 없어 기준 시계열을 만들 수 없습니다.'
    );
  }
  if (!build) {
    throw new Error('빌드 조각(build.json)이 없어 번들·코드건강을 기록할 수 없습니다.');
  }
  return {
    timestamp,
    app: app.name,
    env: app.env,
    targetUrl: app.targetUrl,
    gitRef: build.gitRef,
    ...(mobile.environment ? { environment: mobile.environment } : {}),
    pages: mobile.pages,
    ...(desktop && desktop.pages.length > 0
      ? { desktopPages: desktop.pages }
      : {}),
    bundle: build.build.bundle,
    buildTimeSec: build.build.buildTimeSec,
    ...(field ? { field } : {}),
    seo: build.seo,
    runtime: build.runtime,
    codeHealth: build.build.codeHealth,
  };
};
