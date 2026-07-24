import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { BundleMetrics, CodeHealthMetrics } from './types';

type BuildManifest = {
  rootMainFiles?: string[];
  polyfillFiles?: string[];
  pages?: Record<string, string[]>;
};

// 순수: 파일 목록 + 크기조회 함수 → 합산 KB (중복 제거)
export const computeFirstLoadKb = (
  files: string[],
  sizeOf: (file: string) => number,
): number => {
  const unique = [...new Set(files)];
  const bytes = unique.reduce((sum, f) => sum + sizeOf(f), 0);
  return Math.round(bytes / 1024);
};

export const measureBundle = (repoPath: string): BundleMetrics => {
  const nextDir = join(repoPath, '.next');
  const manifestPath = join(nextDir, 'build-manifest.json');
  if (!existsSync(manifestPath)) {
    return { totalFirstLoadKb: 0, routes: [] };
  }
  let manifest: BuildManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BuildManifest;
  } catch {
    console.warn(`[quality] build-manifest 파싱 실패: ${manifestPath}`);
    return { totalFirstLoadKb: 0, routes: [] };
  }
  const sizeOf = (file: string): number => {
    const p = join(nextDir, file);
    return existsSync(p) ? statSync(p).size : 0;
  };
  const shared = [
    ...(manifest.rootMainFiles ?? []),
    ...(manifest.polyfillFiles ?? []),
  ];
  const totalFirstLoadKb = computeFirstLoadKb(shared, sizeOf);
  const routes: { route: string; firstLoadKb: number }[] = [
    { route: 'shared', firstLoadKb: totalFirstLoadKb },
  ];
  for (const [route, files] of Object.entries(manifest.pages ?? {})) {
    routes.push({
      route,
      firstLoadKb: computeFirstLoadKb([...shared, ...files], sizeOf),
    });
  }
  return { totalFirstLoadKb, routes };
};

export const parseTscCount = (output: string): number =>
  output.split('\n').filter((l) => /error TS\d+:/.test(l)).length;

export const parseEslintCount = (
  output: string,
): { errors: number; warnings: number } => {
  const m = output.match(/\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/);
  if (!m) return { errors: 0, warnings: 0 };
  return { errors: Number(m[1]), warnings: Number(m[2]) };
};

const execStatus = (
  cmd: string,
  cwd: string,
): { ok: boolean; output: string } => {
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ''}\n${err.stderr ?? ''}` };
  }
};

const safeExec = (cmd: string, cwd: string): string => {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
  }
};

const countTodoFixme = (repoPath: string): number => {
  const out = safeExec(
    `grep -rEc "TODO|FIXME" --include="*.ts" --include="*.tsx" app 2>/dev/null | awk -F: '{s+=$2} END {print s+0}'`,
    repoPath,
  );
  return Number(out.trim()) || 0;
};

export type BuildResult = {
  bundle: BundleMetrics;
  buildTimeSec: number;
  codeHealth: CodeHealthMetrics;
};

export const measureBuild = (repoPath: string): BuildResult => {
  const pm = basename(repoPath) === 'chart' ? 'npm run' : 'yarn';

  const start = Date.now();
  const build = execStatus(`${pm} build`, repoPath);
  const buildTimeSec = Math.round((Date.now() - start) / 1000);
  if (!build.ok) {
    console.error(
      `[quality] ${repoPath} 빌드 실패 — 번들 측정을 신뢰할 수 없음(0으로 기록될 수 있음)`,
    );
  }

  const tscOut = safeExec(`npx tsc --noEmit`, repoPath);
  const eslintOut = safeExec(`npx eslint .`, repoPath);
  const eslint = parseEslintCount(eslintOut);

  return {
    bundle: measureBundle(repoPath),
    buildTimeSec,
    codeHealth: {
      tscErrors: parseTscCount(tscOut),
      eslintErrors: eslint.errors,
      eslintWarnings: eslint.warnings,
      todoFixme: countTodoFixme(repoPath),
    },
  };
};
