import { describe, expect, it } from 'vitest';

import { radarLayout } from './radarLayout';

describe('radarLayout', () => {
  it('넓으면 분야 이름 그대로, 좌우 여백 52 — 데스크톱 균형 카드의 레이더 칸(360px)도 여기', () => {
    const layout = radarLayout(360);
    expect(layout.label('예술/대중문화')).toBe('예술/대중문화');
    expect(layout.margin.left).toBe(52);
  });

  it('좁으면(모바일 카드 — 큰 폰 430px 화면도 약 350) 앞부분만 짧게, 여백도 줄여 레이더를 키운다', () => {
    expect(radarLayout(350).label('예술/대중문화')).toBe('예술');
    const layout = radarLayout(311);
    expect(layout.label('예술/대중문화')).toBe('예술');
    expect(layout.label('소설/시/희곡')).toBe('소설');
    expect(layout.label('인문학')).toBe('인문학');
    expect(layout.margin.left).toBeLessThan(52);
    expect(layout.margin.right).toBe(layout.margin.left);
  });

  it('폭을 아직 모르면(0) 넓은 쪽으로 — 첫 그림이 짧은 이름으로 깜빡이지 않게', () => {
    expect(radarLayout(0).label('예술/대중문화')).toBe('예술/대중문화');
  });
});
