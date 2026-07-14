/**
 * 날짜 관련 유틸리티
 *
 * 왜 상대 시간인가:
 *   "3시간 전 완독"은 **지금이 몇 시인지 아는 화면**에서만 나온다.
 *   시간이 박힌 문자열이 화면에 있다는 것 자체가 살아 있는 서비스의 증거다.
 *   (00_docs/07 §1.3-①)
 *
 * 왜 오래된 건 절대 날짜인가:
 *   "13개월 전"은 아무 정보도 주지 않는다. "2025.06.12"가 유용하다.
 *   교보·밀리 모두 오래된 항목은 날짜로 적는다.
 *   → 기본 7일. 그 이후는 절대 날짜로 떨어진다.
 *
 * 통합 이력 (2026-07-14):
 *   같은 일을 하는 구현이 세 곳에 흩어져 있었다.
 *   - src/shared/lib/date.ts 의 formatDistanceToNow (자체)
 *   - src/features/comment 의 date-fns formatDistanceToNow (ko locale)
 *   - src/widgets/activity 의 로컬 getRelativeTime
 *   → 여기로 통일했다. date-fns 는 더 이상 코드에서 쓰지 않는다.
 */

/** 상대 시간으로 표시할 최대 기간(일). 이 이상 지나면 절대 날짜로 적는다. */
const DEFAULT_RELATIVE_LIMIT_DAYS = 7;

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

type FormatOptions = {
  /** 며칠까지 상대 시간으로 쓸지 */
  relativeLimitDays?: number;
};

/**
 * "방금 전" · "3분 전" · "5시간 전" · "3일 전" · "2026.06.12"
 */
export const formatRelativeTime = (
  date: string | Date,
  { relativeLimitDays = DEFAULT_RELATIVE_LIMIT_DAYS }: FormatOptions = {}
): string => {
  const past = typeof date === 'string' ? new Date(date) : date;

  // 잘못된 날짜를 "Invalid Date"로 화면에 흘려보내지 않는다
  if (Number.isNaN(past.getTime())) return '';

  const diffInSeconds = Math.floor((Date.now() - past.getTime()) / 1000);

  // 미래 시각(서버-클라이언트 시계 오차) — "-3분 전"을 만들지 않는다
  if (diffInSeconds < MINUTE) return '방금 전';

  if (diffInSeconds < HOUR) {
    return `${Math.floor(diffInSeconds / MINUTE)}분 전`;
  }

  if (diffInSeconds < DAY) {
    return `${Math.floor(diffInSeconds / HOUR)}시간 전`;
  }

  const diffInDays = Math.floor(diffInSeconds / DAY);
  if (diffInDays < relativeLimitDays) {
    return `${diffInDays}일 전`;
  }

  return formatDate(past);
};

/** "2026.06.12" */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

/**
 * "2026년 7월 14일 화요일"
 *
 * 밀리의서재가 "07월 13일 월요일 업데이트"처럼 요일까지 적는 이유:
 * 요일은 사람이 쓴 티가 나고, 갱신 책임을 진다는 선언이 된다.
 */
export const formatFullDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

/** <time datetime="..."> 속성에 넣을 값 — 기계가 읽는 형식 */
export const toDateTimeAttr = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
};

/**
 * @deprecated `formatRelativeTime` 을 쓸 것.
 * 기존 호출부 호환용으로만 남겨 둔다.
 */
export const formatDistanceToNow = (date: string): string =>
  formatRelativeTime(date);
