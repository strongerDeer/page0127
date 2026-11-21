import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: 모든 서버 액션이 체험 계정을 확인하는지 검사한다.
 *
 * 왜 소스를 훑는가:
 * 체험 계정의 /api 쓰기는 proxy 가 한 곳에서 막지만, 서버 액션은 "페이지 경로로 가는 POST"라
 * 경로만 보고는 어느 액션인지 알 수 없다. 그래서 액션마다 isDemoUser 로 직접 막는다.
 * 새 액션을 만들면서 그 한 줄을 잊어도 **아무 에러가 안 난다**(DB 트리거가 마지막에 막긴 하지만
 * 사용자는 "저장하지 못했어요" 같은 엉뚱한 안내를 본다). 이 테스트가 그 실수를 CI 에서 잡는다.
 *
 * 통과 조건(하나만 맞으면 된다):
 *   - isDemoUser( 를 부른다
 *   - assertAdmin / getAdminUser 로 관리자만 쓰는 액션이다(체험 계정은 관리자가 아니다)
 *   - 아래 ALLOWED 에 이유와 함께 적혀 있다
 */

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['src', 'app'];

/** 체험 계정에게도 열어 두는 액션 — 사용자 기록을 바꾸지 않는 것만 */
const ALLOWED: Record<string, string> = {
  // 오늘의 문장 뽑기 — 체험에서도 보여 주고 싶은 기능. 뽑은 기록(sentence_draws)만 남는다
  'src/features/daily-sentence/api/drawDailySentenceAction.ts': '오늘의 문장',
};

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

const serverActionFiles = SCAN_DIRS.flatMap((dir) =>
  collectFiles(join(APP_ROOT, dir))
)
  .map((file) => ({
    path: relative(APP_ROOT, file),
    source: readFileSync(file, 'utf8'),
  }))
  .filter(({ source }) => /^['"]use server['"]/m.test(source));

describe('서버 액션 — 체험 계정 읽기 전용', () => {
  it('서버 액션 파일을 찾는다(검사 자체가 비어 있지 않은지)', () => {
    expect(serverActionFiles.length).toBeGreaterThan(5);
  });

  it.each(serverActionFiles.map((file) => [file.path, file.source]))(
    '%s 는 체험 계정을 막거나 관리자 전용이거나 허용 목록에 있다',
    (path, source) => {
      const guarded =
        source.includes('isDemoUser(') ||
        /\b(assertAdmin|getAdminUser)\(/.test(source) ||
        path in ALLOWED;
      expect(guarded).toBe(true);
    }
  );
});
