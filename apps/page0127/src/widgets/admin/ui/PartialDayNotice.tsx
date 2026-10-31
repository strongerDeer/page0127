/**
 * 기간에 오늘(KST)이 들어 있을 때 띄우는 안내.
 * 오늘 숫자는 하루가 끝날 때까지 계속 늘고, GA 는 수 분~수 시간 늦게 채워진다.
 * 그래서 이때는 앞 기간 대비 증감을 숨긴다(반나절을 꽉 찬 하루와 견주면 무조건 줄어 보인다).
 */
export const PartialDayNotice = () => (
  <p
    role='note'
    className='rounded-lg border border-line px-3 py-2 text-xs text-text-subtle'
  >
    오늘은 아직 집계 중이에요. 숫자는 하루가 끝날 때까지 계속 늘고, GA 는 몇
    분~몇 시간 늦게 들어옵니다. 그래서 오늘이 들어간 기간은 앞 기간 대비 증감을
    보여 주지 않아요.
  </p>
);
