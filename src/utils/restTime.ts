export default function restTime(ms: number) {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const days = Math.floor(ms / day);

  // 모집 종료
  if (days < 0) {
    return '';
  }

  const restHour = Math.floor((ms - days * day) / hour);
  const restMinute = Math.floor((ms - days * day - restHour * hour) / minute);
  const restSecond = Math.floor(
    (ms - days * day - restHour * hour - restMinute * minute) / 1000,
  );

  const HH = `${restHour}`.padStart(2, '0');
  const mm = `${restMinute}`.padStart(2, '0');
  const SS = `${restSecond}`.padStart(2, '0');
  return days > 0 ? `${days}일 ${HH}:${mm}:${SS}` : `${HH}:${mm}:${SS}`;
}
