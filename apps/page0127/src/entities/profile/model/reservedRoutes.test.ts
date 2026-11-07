import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { RESERVED_USERNAMES } from './username';

/**
 * 안전망: 예약어 목록이 실제 라우트·DB 와 어긋나지 않게 지킨다.
 *
 * 왜 필요한가:
 * 예약어는 TS(`RESERVED_USERNAMES`)와 SQL(`is_reserved_username()`) 두 곳에
 * 손으로 적혀 있다. 8월에 적은 뒤 /updates·/onboarding·/library 가 생겼지만
 * 아무도 목록을 고치지 않았고, 그 아이디로 가입한 사람의 서재가 열리지 않는
 * 버그가 됐다. "라우트를 추가할 때 기억하기"는 규칙이 아니라 희망이므로
 * 파일 시스템을 직접 읽어 비교한다.
 */

const APP_DIR = fileURLToPath(new URL('../../../../app', import.meta.url));
const PUBLIC_DIR = fileURLToPath(
  new URL('../../../../public', import.meta.url)
);
const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../../../../../supabase/migrations', import.meta.url)
);

/** 아이디로 쓸 수 있는 모양인가 (DB CHECK 와 같은 패턴) */
const USERNAME_SHAPE = /^[a-z0-9_]{3,20}$/;

const listDirs = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

/**
 * app/ 의 최상위 URL 세그먼트를 모은다.
 *
 * - `(public)` 같은 route group 은 URL 에 안 나오므로 안으로 들어간다
 * - `[username]` 같은 동적 세그먼트는 충돌 대상이 아니다
 * - `_helpers` 같은 private 폴더는 라우트가 아니다
 */
const collectTopLevelSegments = (dir: string): string[] =>
  listDirs(dir).flatMap((name) => {
    if (name.startsWith('(') && name.endsWith(')')) {
      return collectTopLevelSegments(join(dir, name));
    }
    if (name.startsWith('[') || name.startsWith('_')) return [];
    return [name];
  });

/**
 * 가장 최근 마이그레이션에 정의된 is_reserved_username() 의 단어 목록.
 * CREATE OR REPLACE 로 여러 번 정의되므로 마지막 정의가 곧 DB 의 현재 상태다.
 */
const readLatestSqlReservedWords = (): { file: string; words: string[] } => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of [...files].reverse()) {
    // 주석을 먼저 지운다 — 주석 속 '/[username]' 의 ']' 가 배열 끝으로 읽히지 않게
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').replace(
      /--.*$/gm,
      ''
    );
    const match = sql.match(
      /CREATE OR REPLACE FUNCTION is_reserved_username[\s\S]*?ARRAY\[([\s\S]*?)\]/
    );
    if (!match) continue;

    // 작은따옴표 안의 단어만 뽑는다
    const words = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    return { file, words };
  }

  throw new Error(
    'is_reserved_username() 을 정의한 마이그레이션을 찾지 못했다'
  );
};

describe('예약어 ↔ 라우트', () => {
  it('app/ 최상위 경로는 전부 예약어다 (빠지면 그 아이디의 서재가 안 열린다)', () => {
    const missing = collectTopLevelSegments(APP_DIR)
      .filter((segment) => USERNAME_SHAPE.test(segment))
      .filter((segment) => !RESERVED_USERNAMES.has(segment));

    // 실패하면: username.ts 의 RESERVED_USERNAMES 와 새 마이그레이션에 추가한다
    expect(missing).toEqual([]);
  });

  it('public/ 폴더 이름도 전부 예약어다 (/[username]/... 하위 주소와 겹친다)', () => {
    const missing = listDirs(PUBLIC_DIR)
      .filter((name) => USERNAME_SHAPE.test(name))
      .filter((name) => !RESERVED_USERNAMES.has(name));

    expect(missing).toEqual([]);
  });
});

describe('예약어 ↔ DB', () => {
  it('RESERVED_USERNAMES 와 최신 is_reserved_username() 목록이 같다', () => {
    const { file, words } = readLatestSqlReservedWords();
    const sql = new Set(words);
    const ts = RESERVED_USERNAMES;

    // 어느 쪽에만 있는지 보여 줘야 고치기 쉽다
    const onlyInTs = [...ts].filter((word) => !sql.has(word)).sort();
    const onlyInSql = [...sql].filter((word) => !ts.has(word)).sort();

    expect({ file, onlyInTs, onlyInSql }).toEqual({
      file,
      onlyInTs: [],
      onlyInSql: [],
    });
  });
});
