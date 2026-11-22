import type { ExportFormat } from './types';

/**
 * 내려받을 파일 이름과 응답 헤더.
 *
 * 학습 포인트 — Content-Disposition:
 * - `attachment` 면 브라우저가 화면에 띄우지 않고 파일로 저장한다 (`inline` 은 띄운다).
 * - 헤더 값은 원래 ASCII 만 안전하다. 한글 이름은 `filename*=UTF-8''<퍼센트 인코딩>`
 *   (RFC 5987/6266)으로 주고, 그걸 모르는 오래된 브라우저를 위해 ASCII `filename=` 을 같이 둔다.
 *   둘 다 있으면 요즘 브라우저는 `filename*` 을 쓴다.
 */

export const parseExportFormat = (value: string | null): ExportFormat | null =>
  value === 'csv' || value === 'md' ? value : null;

const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
};

export const exportFileHeaders = (
  format: ExportFormat,
  exportedOn: string
): Record<string, string> => {
  const ascii = `page0127-records-${exportedOn}.${format}`;
  const korean = `page0127-독서기록-${exportedOn}.${format}`;
  return {
    'Content-Type': CONTENT_TYPE[format],
    'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(korean)}`,
    // 개인 기록이다 — 브라우저·CDN 어디에도 남기지 않는다
    'Cache-Control': 'private, no-store',
  };
};
