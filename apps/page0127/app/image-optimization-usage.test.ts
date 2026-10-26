import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: `next/image` 를 쓰는 파일은 최적화 판정도 함께 쓰는지 검사한다.
 *
 * 왜 소스를 훑는가:
 * 이 규칙은 **빠뜨려도 아무 에러가 안 난다.** 개발·Preview 에서는 변환 한도가
 * 넉넉해 잘 보이고, 운영에서 한도가 소진된 어느 날 갑자기 그 화면의 이미지만
 * 사라진다. 그때도 로그에는 아무것도 안 남는다(브라우저의 이미지 로드 실패다).
 *
 * 2026-08-23 표지가, 2026-08-25 프로필 사진이 그렇게 사라졌다. 두 번 다 원인은
 * 같았고, 고친 방법도 같았다 — 판정 함수는 이미 있었는데 **새로 그린 화면이
 * 그 함수를 안 불렀다.** 파일이 열 곳으로 흩어져 있어 다음에도 빠뜨리기 쉽다.
 *
 * 그래서 값이 아니라 **호출 여부**만 본다. 어떤 호스트를 넣고 뺄지는
 * `packages/ui/tests/image-optimization.test.ts` 가 따로 지킨다.
 */

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['src', 'app'];

/**
 * 최적화 판정이 필요 없는 파일.
 *
 * 로컬 정적 이미지(`/images/...`)만 그리는 파일이라면 여기 넣는다 — 로컬
 * 이미지는 변환을 거쳐도 한도를 태우는 원격 소스가 아니다.
 * **원격 URL(표지·프로필 사진)을 하나라도 그린다면 넣지 말 것.**
 */
const EXEMPT_FILES: string[] = [];

const collectFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
};

const toRelative = (file: string) => file.slice(APP_ROOT.length);

describe('next/image 사용처의 최적화 판정', () => {
  const files = SCAN_DIRS.flatMap((dir) => collectFiles(join(APP_ROOT, dir)));

  it('스캔 대상 파일이 실제로 잡힌다', () => {
    // 경로가 어긋나 0개를 훑고도 통과하는 상황을 막는다.
    expect(files.length).toBeGreaterThan(0);
  });

  it('next/image 를 쓰는 파일은 isPreOptimizedImageSrc 도 쓴다', () => {
    const missing = files
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        if (!source.includes("from 'next/image'")) return false;
        return !source.includes('isPreOptimizedImageSrc');
      })
      .map(toRelative)
      .filter((relative) => !EXEMPT_FILES.includes(relative));

    expect(missing).toEqual([]);
  });
});
