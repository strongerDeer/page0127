/**
 * 회원 목록에 붙이는 파생 정보 — DB 조회 없이 계산만 하는 순수 함수 모음.
 * 조회(getMembers)와 분리해 두면 Supabase 없이 단위 테스트할 수 있다.
 */

/** 활동일을 세는 기간. user_daily_visits 는 하루 한 사람 한 줄이라 50명 × 30일 = 최대 1,500행 */
export const ACTIVE_WINDOW_DAYS = 30;

/**
 * 목록 화면용 이메일 가리기 — 앞 3글자와 도메인만 남긴다.
 *
 * 개인정보보호법 안전성 확보조치: 업무에 꼭 필요한 만큼만 보여 준다.
 * 목록은 "누구인지 대충 알아보는" 용도라 전체가 필요 없다.
 * 전체 주소는 상세 화면에서 버튼을 눌러 열람 기록을 남긴 뒤에만 보여 준다.
 */
export const maskEmail = (email: string | null): string | null => {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  // '@' 가 없거나 맨 앞이면 이메일 형식이 아니다 — 원문을 흘리지 않도록 전부 가린다
  if (at <= 0) return '***';

  const local = email.slice(0, at);
  const domain = email.slice(at);
  // 짧은 아이디(abc@)는 3글자를 남기면 사실상 원문이라 1글자만 남긴다
  const keep = local.length <= 3 ? 1 : 3;
  return `${local.slice(0, keep)}***${domain}`;
};

export type VisitSummary = {
  /** 최근 ACTIVE_WINDOW_DAYS 일 중 들어온 날 수 */
  activeDays: number;
  /** 그 기간 안의 마지막 방문일(KST, YYYY-MM-DD). 없으면 null */
  lastVisit: string | null;
};

/** user_daily_visits 행들을 회원별 { 활동일 수, 마지막 방문일 } 로 접는다 */
export const summarizeVisits = (
  rows: { user_id: string; visit_date: string }[]
): Map<string, VisitSummary> => {
  const map = new Map<string, VisitSummary>();
  for (const r of rows) {
    const prev = map.get(r.user_id) ?? { activeDays: 0, lastVisit: null };
    map.set(r.user_id, {
      activeDays: prev.activeDays + 1,
      // 'YYYY-MM-DD' 는 문자열 비교가 곧 날짜 비교다
      lastVisit:
        prev.lastVisit && prev.lastVisit > r.visit_date
          ? prev.lastVisit
          : r.visit_date,
    });
  }
  return map;
};

/**
 * 감사 기록용 "2026. 10. 4. 오전 8:30" — 시각까지 KST 로 고정한다.
 * timeZone 을 안 주면 서버(Vercel = UTC) 시계로 찍혀 9시간 어긋난다.
 */
export const formatKstDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

/** Supabase Auth 의 provider 값 → 화면 표기 */
export const providerLabel = (provider: string | null | undefined): string => {
  switch (provider) {
    case 'google':
      return '구글';
    case 'kakao':
      return '카카오';
    case 'email':
      return '이메일';
    default:
      return provider ?? '-';
  }
};
