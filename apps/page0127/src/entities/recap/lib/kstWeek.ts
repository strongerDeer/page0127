import { toKstDateKey } from '@/shared/lib/date';

/** 양끝을 포함하는 KST 주 구간. 값은 'YYYY-MM-DD' */
export type KstWeekRange = {
  startKey: string;
  endKey: string;
};

/**
 * 날짜 키에 일수를 더한다.
 *
 * 'YYYY-MM-DD'를 Date로 파싱하면 UTC 자정으로 읽힌다. 그래서 UTC getter/setter만
 * 쓰는 한 실행 환경의 시간대에 영향받지 않는다. 여기서 getDate()/setDate() 같은
 * 로컬 getter를 쓰면 서버 시간대에 따라 하루가 밀린다.
 */
const shiftDateKey = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * 기준 시각이 속한 KST 주(월~일)의 시작·끝 날짜를 준다.
 *
 * 왜 KST인가: 서버는 UTC로 돈다. UTC로 주를 자르면 한국 시각 월요일 새벽 0~9시가
 * 지난 주로 밀린다(그 시각 UTC는 아직 일요일이라서).
 */
export const toKstWeekRange = (now: Date): KstWeekRange => {
  const todayKey = toKstDateKey(now);

  // getUTCDay(): 0=일 … 6=토. 월요일 시작으로 옮긴다(월=0 … 일=6)
  const dayOfWeek = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const startKey = shiftDateKey(todayKey, -daysSinceMonday);

  return { startKey, endKey: shiftDateKey(startKey, 6) };
};

/**
 * 날짜 키가 주 구간 안에 있는지 (양끝 포함).
 * 'YYYY-MM-DD'는 자릿수가 고정이라 문자열 비교가 곧 날짜 비교다.
 */
export const isWithinWeek = (dateKey: string, week: KstWeekRange): boolean =>
  dateKey >= week.startKey && dateKey <= week.endKey;
