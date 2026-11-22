import { describe, expect, it } from 'vitest';

import { exportFileHeaders, parseExportFormat } from './exportFile';

describe('parseExportFormat', () => {
  it('csv·md 만 받는다', () => {
    expect(parseExportFormat('csv')).toBe('csv');
    expect(parseExportFormat('md')).toBe('md');
    expect(parseExportFormat('xlsx')).toBeNull();
    expect(parseExportFormat(null)).toBeNull();
  });
});

describe('exportFileHeaders', () => {
  it('ASCII 이름과 UTF-8 한글 이름을 함께 주고, 캐시하지 않는다', () => {
    const headers = exportFileHeaders('csv', '2026-11-22');
    expect(headers['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(headers['Content-Disposition']).toBe(
      `attachment; filename="page0127-records-2026-11-22.csv"; filename*=UTF-8''page0127-${encodeURIComponent('독서기록')}-2026-11-22.csv`
    );
    expect(headers['Cache-Control']).toBe('private, no-store');
  });
});
