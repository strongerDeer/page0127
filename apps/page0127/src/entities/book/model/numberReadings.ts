/** 회독 번호를 매기는 데 필요한 최소 정보 */
type Readable = {
  read_count: number;
  completed_date: string | null;
  created_at: string;
};

/**
 * 회독 목록에 "몇 회독인지" 번호를 매기고 최신 회독을 맨 위로 올린다.
 *
 * 왜 저장된 `read_count` 를 그대로 쓰지 않는가:
 * 그 값은 등록 시점에 딱 한 번 정해진다 — 중복 감지(getBookByISBN)가
 * ISBN 표기 차이(ISBN10/13, 알라딘 상품코드)로 빗나가면 재독인데도 새 책으로
 * 등록돼 둘 다 1 로 남는다. 나중에 ISBN 을 맞춰 같은 책이 되어도 그 값은
 * 따라오지 않아 목록이 "1회독 / 1회독" 이 된다.
 *
 * 그래서 읽은 순서대로 세어 번호를 매긴다. 책장(model/dedupeReadings.ts)이
 * 합쳐진 기록 수를 회독 수로 쓰는 것과 같은 규칙이다.
 *
 * 다만 저장값이 더 크면 그쪽을 존중한다 — 재독 다이얼로그로 제대로 등록한
 * 3회독이 화면에 그 기록만 보인다고 "1회독" 으로 내려가면 안 된다.
 * 번호가 뒤로 갈수록 반드시 커지게 해서 같은 번호가 두 줄에 붙지 않도록 한다.
 *
 * 방문자에게는 공개된 회독만 넘어오므로 번호도 '보이는 기록 안에서'의
 * 순번이다 — 화면이 보여주는 범위 안에서 셈을 맞추는 앱의 규칙과 같다.
 */
export const numberReadings = <T extends Readable>(
  readings: T[]
): (T & { reading_number: number })[] => {
  // 완독일이 없는 회독(읽는 중)은 등록 시각이 그 자리를 대신한다
  const readAt = (reading: T) =>
    new Date(reading.completed_date ?? reading.created_at).getTime();

  // 정렬은 호출부의 배열을 건드리지 않도록 복사본에서 한다
  const oldestFirst = [...readings].sort((a, b) => readAt(a) - readAt(b));

  let previous = 0;
  const numbered = oldestFirst.map((reading) => {
    previous = Math.max(reading.read_count, previous + 1);
    return { ...reading, reading_number: previous };
  });

  // 화면은 최신 회독을 맨 위에 둔다
  return numbered.reverse();
};
