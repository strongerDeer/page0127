import { describe, expect, it } from 'vitest';

import { parseQualityReport } from './parseReport';

// 2026-10-05 실제 리포트의 모양 (축약)
const REAL = `**핵심:** 이번 주는 지난주보다 나빠진 항목이 없고, 프로필 페이지의 JS를 줄이는 것이 가장 큰 개선 여지입니다.

**주요 발견**
- 지난주보다 나빠진 항목은 0건입니다.
- 모바일에서 가장 약한 곳은 프로필 페이지(\`/dreamfulbud\`)입니다. TBT(화면이 멈춰 반응 못 하는 시간)가 약 0.75초입니다.

**다음 주 우선순위**
1. 프로필 페이지 JS 줄이기: 번들 분석으로 846KB 중 프로필에만 들어가는 큰 의존성을 찾습니다.
2. 홈·라이브러리 이미지 줄이기: 책 표지를 \`next/image\` 등으로 내려줍니다.
3. 공용 첫 로드 JS(724KB) 줄이기: 공통 번들을 점검합니다.`;

describe('parseQualityReport', () => {
  it('핵심 · 주요 발견 · 우선순위를 조각으로 나눈다', () => {
    const r = parseQualityReport(REAL);
    expect(r?.headline).toMatch(/^이번 주는/);
    expect(r?.findings).toHaveLength(2);
    expect(r?.actions.map((a) => a.title)).toEqual([
      '프로필 페이지 JS 줄이기',
      '홈·라이브러리 이미지 줄이기',
      '공용 첫 로드 JS(724KB) 줄이기',
    ]);
    expect(r?.actions[0].body).toMatch(/^번들 분석으로/);
  });

  it('할 일에 콜론이 없으면 전체를 제목으로', () => {
    const r = parseQualityReport(
      '**핵심:** 요약\n\n**다음 주 우선순위**\n1. 새 배포 후 재측정'
    );
    expect(r?.actions).toEqual([{ title: '새 배포 후 재측정', body: '' }]);
  });

  it('머리글에 콜론이 붙어도 같은 구역으로 본다', () => {
    const r = parseQualityReport(
      '**핵심:** 요약\n**주요 발견:**\n- 발견\n**다음 주 우선순위:**\n1. 할 일: 설명'
    );
    expect(r?.findings).toEqual(['발견']);
    expect(r?.actions).toHaveLength(1);
  });

  it('틀을 벗어난 글(핵심 또는 할 일 없음)은 null — 원문으로 보여 준다', () => {
    expect(parseQualityReport('그냥 문단 하나')).toBeNull();
    expect(parseQualityReport('**핵심:** 요약만 있음')).toBeNull();
  });
});
