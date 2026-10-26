/**
 * 검색어·바코드 값이 ISBN 이면 ISBN13 으로 돌려준다. 아니면 `null`.
 *
 * 바코드 리더기는 키보드처럼 13자리를 "타이핑"하고, 사람은 책 뒤에 적힌
 * `978-89-364-3412-0` 처럼 하이픈을 섞어 친다. 둘 다 같은 길로 받으려고
 * 하이픈·공백을 걷어낸 뒤 판정한다.
 *
 * 체크 숫자까지 확인한다 — 제목이 숫자뿐인 책(예: "1984")이나 오타 난 숫자를
 * ISBN 조회로 보내면 결과가 비어 버리므로, 진짜 ISBN 일 때만 조회 경로를 탄다.
 * 상세 조회(getByIsbn)는 ISBN13 을 받으므로 옛 ISBN10 은 13자리로 바꿔 준다.
 */
export const parseIsbn = (input: string): string | null => {
  const raw = input.replace(/[\s-]/g, '').toUpperCase();

  if (/^97[89]\d{10}$/.test(raw)) {
    return isValidIsbn13(raw) ? raw : null;
  }

  if (/^\d{9}[\dX]$/.test(raw)) {
    return isValidIsbn10(raw) ? isbn10To13(raw) : null;
  }

  return null;
};

// ISBN13: 홀수 자리 ×1, 짝수 자리 ×3 을 더해 10의 배수면 유효
const isValidIsbn13 = (isbn: string) => {
  const sum = [...isbn].reduce(
    (acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3),
    0
  );
  return sum % 10 === 0;
};

// ISBN10: 앞에서부터 ×10, ×9 … ×1 을 더해 11의 배수면 유효 (마지막 X = 10)
const isValidIsbn10 = (isbn: string) => {
  const sum = [...isbn].reduce(
    (acc, ch, i) => acc + (ch === 'X' ? 10 : Number(ch)) * (10 - i),
    0
  );
  return sum % 11 === 0;
};

// 978 을 붙이고 체크 숫자를 ISBN13 규칙으로 다시 계산한다
const isbn10To13 = (isbn10: string) => {
  const body = `978${isbn10.slice(0, 9)}`;
  const sum = [...body].reduce(
    (acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3),
    0
  );
  return `${body}${(10 - (sum % 10)) % 10}`;
};
