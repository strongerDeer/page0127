/**
 * 출간일 정규화
 *
 * 공급자마다 형식이 다르다 — 알라딘은 `2014-05-19`, YES24는 `20140519`.
 * DB의 `pub_date`는 TEXT 한 칸뿐이라 형식이 섞이면 화면에 둘 다 튀어나온다.
 *
 * **저장 형식은 `YYYY-MM-DD`(ISO 8601)로 통일한다.** 이유는 셋이다:
 *
 *   1. 기존 데이터가 이미 이 형식이다 — 기존 행을 한 줄도 다시 쓰지 않아도 된다.
 *      형식을 바꾸는 일괄 수정은 에러 없이 일부만 바뀌어도 아무도 모른다.
 *   2. 화면이 `pub_date`를 그대로 출력하고 있어(`BookDetailContent` 등 3곳),
 *      저장 형식이 곧 표시 형식이다. 읽을 때 되돌리는 변환이 필요 없다.
 *   3. `new Date('2014-05-19')`는 파싱되지만 `new Date('20140519')`는 안 된다.
 *      나중에 `pub_date`를 진짜 `date` 컬럼으로 승격할 때도 그대로 캐스팅된다.
 *
 * 그래서 변환은 **쓸 때 한 번뿐**이다. 어댑터가 공급자 응답을 옮기며 호출한다.
 *
 * 학습 포인트:
 * - 외부 형식을 경계(어댑터)에서 한 번만 내부 형식으로 바꾸면, 안쪽 코드는
 *   공급자가 몇 개든 한 가지 형식만 알면 된다
 */

/** `20140519` — YES24가 쓰는 형식 */
const COMPACT_DATE = /^(\d{4})(\d{2})(\d{2})$/;

/** `2014-05-19`·`2014.05.19`·`2014/05/19` */
const DELIMITED_DATE = /^(\d{4})[-.\/](\d{2})[-.\/](\d{2})$/;

/**
 * 저장용으로 정규화한다 — `YYYY-MM-DD`
 *
 * 알아보지 못한 값은 **버리지 않고 원본 그대로** 돌려준다. 기존 데이터에 `2014`나
 * `2014년 5월` 같은 값이 섞여 있을 수 있는데, 정규화에 실패했다고 null로 만들면
 * 화면에서 출간일이 조용히 사라지고 무엇이 지워졌는지도 남지 않는다.
 *
 * @example
 * normalizePubDate('20140519')   // '2014-05-19'  (YES24)
 * normalizePubDate('2014-05-19') // '2014-05-19'  (알라딘 — 그대로)
 * normalizePubDate('2014')       // '2014'        (알아보지 못한 값은 보존)
 */
export const normalizePubDate = (
  raw: string | null | undefined
): string | null => {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const compact = trimmed.match(COMPACT_DATE);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const delimited = trimmed.match(DELIMITED_DATE);
  if (delimited) return `${delimited[1]}-${delimited[2]}-${delimited[3]}`;

  return trimmed;
};
