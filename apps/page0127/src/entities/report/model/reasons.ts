/**
 * 신고 사유 — 화면과 API 가 같은 목록을 본다.
 *
 * ⚠️ 값은 DB CHECK 제약(`reports_reason_check`)의 거울이다.
 *    늘리려면 `supabase/migrations/…_create_comment_reports.sql` 과 함께 고친다.
 *
 * 넷으로 묶은 이유: 항목이 많아질수록 사용자는 읽지 않고 아무거나 고른다.
 * 운영자가 실제로 다르게 대응하는 갈래만 남겼다.
 */

export const REPORT_REASONS = [
  { value: 'spam', label: '스팸·광고' },
  { value: 'abuse', label: '욕설·비방' },
  { value: 'sexual', label: '음란물' },
  { value: 'other', label: '기타' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

const REASON_VALUES = REPORT_REASONS.map((r) => r.value) as readonly string[];

/** 쿼리·본문으로 들어온 값을 믿지 않기 위해 쓴다 */
export const isReportReason = (value: unknown): value is ReportReason =>
  typeof value === 'string' && REASON_VALUES.includes(value);

/** 어드민 목록에서 사유를 한국어로 보여줄 때 */
export const reportReasonLabel = (value: string): string =>
  REPORT_REASONS.find((r) => r.value === value)?.label ?? value;

/** '기타'로 신고할 때는 설명을 받는다 — 아니면 운영자가 판단할 근거가 없다 */
export const REASON_REQUIRING_DETAIL: ReportReason = 'other';

/** 설명 최대 길이. DB 는 text 지만 화면과 API 가 함께 제한한다 */
export const REPORT_DETAIL_MAX_LENGTH = 300;
