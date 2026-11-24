// 직전 측정과 달라진 측정 환경(Chrome·Lighthouse) 판정 — 순수 함수.
//
// 이 파일에 런타임 의존성을 두지 않는다(타입 import만). 측정 엔진(analyze.ts)과
// 어드민 품질 화면(회귀 배너)이 같이 쓴다 — 자연어 분석이 실패해도 화면에서
// "환경이 바뀌었다"는 걸 볼 수 있게.

import type { QualityRecord } from './types.ts';

const chromeMajor = (v: string): string => v.split('.')[0];

/**
 * 러너 CPU 성능지수(benchmarkIndex)가 직전과 이만큼 넘게 다르면 "다른 성능의 컴퓨터"로 본다.
 *
 * 같은 러너 안에선 몇 % 출렁이지만, GitHub 이 배정하는 러너끼리는 20~30%씩 차이 난다.
 * 실제로 TBT 헛경보가 난 주는 모두 이랬다:
 * 3938→3029(11/2), 4028→2692(11/16), 3011→2466(11/24, 회귀 3건 모두 TBT, JS 크기 변화 0).
 */
export const CPU_CHANGE_RATIO = 0.15;

// 모바일 측정의 성능지수만 기록된다(parts.ts 가 모바일 환경을 레코드에 싣는다).
// 한쪽이라도 0·없음이면 비교하지 않는다(모름 ≠ 바뀜).
export const detectCpuChange = (
  prev: QualityRecord,
  current: QualityRecord
): string | null => {
  const a = prev.environment?.benchmarkIndex ?? 0;
  const b = current.environment?.benchmarkIndex ?? 0;
  if (a <= 0 || b <= 0) return null;
  const ratio = (b - a) / a;
  if (Math.abs(ratio) < CPU_CHANGE_RATIO) return null;
  const pct = Math.round(ratio * 100);
  return `러너 성능지수 ${a}→${b}(${pct > 0 ? '+' : ''}${pct}%)`;
};

// 판정은 Chrome 메이저·Lighthouse 버전·러너 성능지수(15% 넘는 차이)로 한다. 러너 이미지는 매주 바뀌어서
// 그것까지 넣으면 매주 "환경 변경"이 떠 아무도 안 읽게 된다 — 설명에만 덧붙인다.
// 한쪽이라도 기록이 없거나 'unknown' 이면 비교하지 않는다(모름 ≠ 바뀜).
export const detectEnvironmentChanges = (
  prev: QualityRecord,
  current: QualityRecord
): string[] => {
  const a = prev.environment;
  const b = current.environment;
  if (!a || !b) return [];

  const changes: string[] = [];
  if (
    a.chromeVersion !== 'unknown' &&
    b.chromeVersion !== 'unknown' &&
    chromeMajor(a.chromeVersion) !== chromeMajor(b.chromeVersion)
  ) {
    changes.push(`Chrome ${a.chromeVersion}→${b.chromeVersion}`);
  }
  if (
    a.lighthouseVersion !== 'unknown' &&
    b.lighthouseVersion !== 'unknown' &&
    a.lighthouseVersion !== b.lighthouseVersion
  ) {
    changes.push(`Lighthouse ${a.lighthouseVersion}→${b.lighthouseVersion}`);
  }
  if (changes.length > 0 && a.runnerImage !== b.runnerImage) {
    changes.push(`러너 이미지 ${a.runnerImage}→${b.runnerImage}`);
  }
  const cpu = detectCpuChange(prev, current);
  if (cpu) changes.push(cpu);
  return changes;
};
