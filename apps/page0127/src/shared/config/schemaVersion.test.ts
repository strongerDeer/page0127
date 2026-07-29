import { readdirSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import {
  compareSchemaVersion,
  EXPECTED_MIGRATION_VERSION,
} from './schemaVersion';

describe('compareSchemaVersion', () => {
  it('DB가 기대 버전과 같으면 ok', () => {
    expect(compareSchemaVersion('20260729000000', '20260729000000')).toBe('ok');
  });

  it('DB가 앞서 있으면 ok — 마이그레이션 먼저, 코드 나중이 정상 순서다', () => {
    expect(compareSchemaVersion('20260729000000', '20260730000000')).toBe('ok');
  });

  it('DB가 뒤처지면 drift — 코드가 DB에 없는 것을 쓰고 있다', () => {
    // 2026-07-29 사고의 재현: 코드는 ...000005(is_life_book)를 기대했는데
    // 운영 DB는 ...000002 에 머물러 있었다.
    expect(compareSchemaVersion('20260728000005', '20260728000002')).toBe(
      'drift'
    );
  });

  it('버전을 못 읽으면 unknown', () => {
    expect(compareSchemaVersion('20260729000000', null)).toBe('unknown');
    expect(compareSchemaVersion('20260729000000', undefined)).toBe('unknown');
    expect(compareSchemaVersion('20260729000000', '')).toBe('unknown');
  });
});

describe('EXPECTED_MIGRATION_VERSION', () => {
  /**
   * 이 테스트가 이 기능의 안전장치다.
   *
   * 상수는 손으로 관리하는 값이라 마이그레이션을 추가하고 잊기 쉽다. 잊으면
   * 감지 장치가 옛 버전을 기대하게 되어 **진짜 어긋남을 못 잡는다.** 그래서
   * 실제 파일 목록과 대조한다.
   */
  it('실제 마이그레이션 폴더의 최신 번호와 일치한다', () => {
    // vitest 는 apps/page0127 에서 돈다 → 레포 루트의 supabase/ 는 두 단계 위
    const dir = join(process.cwd(), '..', '..', 'supabase', 'migrations');

    const latest = readdirSync(dir)
      .filter((name) => name.endsWith('.sql'))
      .map((name) => name.slice(0, 14))
      .sort()
      .at(-1);

    expect(latest).toBe(EXPECTED_MIGRATION_VERSION);
  });
});
