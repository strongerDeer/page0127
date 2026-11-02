// 직전 측정과 달라진 측정 환경(Chrome·Lighthouse) 판정 — 순수 함수.
//
// 이 파일에 런타임 의존성을 두지 않는다(타입 import만). 측정 엔진(analyze.ts)과
// 어드민 품질 화면(회귀 배너)이 같이 쓴다 — 자연어 분석이 실패해도 화면에서
// "환경이 바뀌었다"는 걸 볼 수 있게.

import type { QualityRecord } from './types.ts';

const chromeMajor = (v: string): string => v.split('.')[0];

// 판정은 Chrome 메이저·Lighthouse 버전으로만 한다. 러너 이미지는 매주 바뀌어서
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
  return changes;
};
