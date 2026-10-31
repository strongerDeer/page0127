/**
 * 기간에 오늘(KST)이 들어 있을 때 띄우는 안내.
 * 오늘 숫자는 하루가 끝날 때까지 계속 늘고, GA 는 수 분~수 시간 늦게 채워진다.
 * 앞 기간 대비 증감은 오늘을 뺀 끝난 날끼리 견준다(comparableRange). 오늘 하루만이면 숨긴다.
 */
export const PartialDayNotice = () => (
  <p
    role='note'
    className='rounded-lg border border-line px-3 py-2 text-xs text-text-subtle'
  >
    오늘은 아직 집계 중이에요. 숫자는 하루가 끝날 때까지 계속 늘고, GA 는 몇
    분~몇 시간 늦게 들어옵니다. 그래서 앞 기간 대비 증감은 오늘을 빼고 어제까지
    끝난 날끼리 견줘요(오늘 하루만 볼 때는 숨겨요).
  </p>
);
