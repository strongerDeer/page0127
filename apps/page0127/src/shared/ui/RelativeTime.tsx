import {
  formatFullDate,
  formatRelativeTime,
  toDateTimeAttr,
} from '@/shared/lib/date';

/**
 * 상대 시간 표시 — "3시간 전"
 *
 * 왜 <time> 태그인가:
 * - `dateTime` 속성으로 기계(스크린 리더·검색엔진)가 정확한 시각을 읽는다
 * - `title` 로 hover 시 "2026년 7월 14일 화요일"이 뜬다.
 *   "3일 전"만 있으면 정확히 언제인지 알 길이 없다.
 *
 * ⚠️ 시각은 렌더 시점에 계산된다. Server Component에서 쓰면 서버 시각 기준으로
 *    HTML에 박히고, 사용자가 페이지를 열어둔 채로 시간이 흘러도 갱신되지 않는다.
 *    피드·알림처럼 계속 열어두는 화면은 어차피 refetch로 다시 그려지므로 무방하다.
 */
type RelativeTimeProps = {
  /** ISO 8601 문자열 또는 Date */
  date: string | Date;
  /** 며칠까지 상대 시간으로 쓸지 (기본 7일, 이후 절대 날짜) */
  relativeLimitDays?: number;
  className?: string;
};

export const RelativeTime = ({
  date,
  relativeLimitDays,
  className,
}: RelativeTimeProps) => {
  const label = formatRelativeTime(date, { relativeLimitDays });

  // 파싱 실패 — 빈 <time>을 남기지 않는다
  if (!label) return null;

  return (
    <time dateTime={toDateTimeAttr(date)} title={formatFullDate(date)} className={className}>
      {label}
    </time>
  );
};
