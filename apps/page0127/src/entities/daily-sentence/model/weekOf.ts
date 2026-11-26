/** 월요일부터 — 서재 캘린더·뽑기 결과·문장 서랍이 같은 순서를 쓴다 */
export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/**
 * 오늘(KST 'YYYY-MM-DD')이 든 주의 월~일 날짜 7개.
 *
 * 날짜 키는 이미 서울 기준이라 UTC 자정으로 읽어 UTC 함수로만 계산한다.
 * (로컬 시간대 함수를 쓰면 서버·브라우저 시간대에 따라 하루가 밀릴 수 있다)
 * 뽑기 결과(SentenceBook)와 문장 서랍 두 곳이 쓰므로 entities 로 내렸다.
 */
export const weekOf = (todayKey: string): string[] => {
  const today = new Date(`${todayKey}T00:00:00Z`);
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - mondayOffset + i);
    return d.toISOString().slice(0, 10);
  });
};
