import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: 클라이언트 컴포넌트가 서버 전용 모듈을 import 하지 않는지 검사한다.
 *
 * 왜 소스를 훑는가:
 * 이 실수도 **아무 에러가 안 난다.** 상수 하나 쓰려고 `aiUsage.ts` 를 import 한
 * 클라이언트 컴포넌트 때문에 OpenAI SDK 전체(압축 약 80KB)가 프로필 페이지 JS 에
 * 실려 있었다(2026-10-26 주간 품질 측정에서 발견). 빌드도 화면도 멀쩡해서
 * 번들을 열어 보기 전엔 알 수 없었다.
 *
 * 상수는 `aiUsageMessages.ts` 에서 가져온다.
 */

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['src', 'app'];

/** 클라이언트 번들에 들어가면 안 되는 import 경로 */
const SERVER_ONLY_IMPORTS = [
  "from 'openai'",
  "from '@/shared/lib/aiUsage'",
  "from '@/shared/lib/openai/client'",
];

const collectFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
};

describe('클라이언트 컴포넌트의 서버 전용 import', () => {
  const clientFiles = SCAN_DIRS.flatMap((dir) =>
    collectFiles(join(APP_ROOT, dir))
  ).filter((file) => /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8')));

  it('스캔 대상 클라이언트 파일이 실제로 잡힌다', () => {
    expect(clientFiles.length).toBeGreaterThan(0);
  });

  it('openai·aiUsage 를 import 하지 않는다', () => {
    const offenders = clientFiles
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return SERVER_ONLY_IMPORTS.some((imp) => source.includes(imp));
      })
      .map((file) => file.slice(APP_ROOT.length));

    expect(offenders).toEqual([]);
  });
});
