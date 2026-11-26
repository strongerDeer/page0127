/**
 * 한 달 달력 칸 — 월요일 시작, 1일 앞은 null 로 채운다.
 * 날짜 키('YYYY-MM-DD')만 다루고 UTC 로 계산해 서버·브라우저 시간대와 상관없이 같다.
 */
export const monthGrid = (monthKey: string): (string | null)[] => {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // 월=0 … 일=6
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from(
      { length: days },
      (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`
    ),
  ];
};

/** '2026-11' 에서 n 달 옮긴 달 키 */
export const shiftMonth = (monthKey: string, n: number): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
